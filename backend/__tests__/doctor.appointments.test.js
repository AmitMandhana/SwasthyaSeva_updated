const request = require('supertest');
const express = require('express');

// Mock Supabase
const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

// Mock PII
jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

// Mock JWT
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
  };
});

// Mock pg Pool for queries
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });
const mockPool = { connect: mockConnect, query: mockQuery, end: jest.fn(), on: jest.fn() };
jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));
jest.mock('../utils/pool', () => ({
  getPool: jest.fn(() => mockPool),
}));

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
const today = futureDate(0);
const tomorrow = futureDate(1);
const nextWeek = futureDate(7);

function doctorToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'doctor', doctor_id: 5, username: 'drdoe' }, 'test-secret', { expiresIn: '1h' });
}

function setupSupabaseMock(table, returnData, returnError = null) {
  const chainMock = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    limit: jest.fn().mockResolvedValue({ data: returnData ? [returnData] : [], error: returnError }),
  };
  mockFrom.mockImplementation((t) => {
    if (t === table) return chainMock;
    return chainMock; // fallback
  });
  return chainMock;
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const doctorRoutes = require('../routes/doctorRoutes');
  app.use('/api/doctor', doctorRoutes);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/appointments/today
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/appointments/today', () => {
  test('returns appointment list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { appointment_id: 1, user_id: 10, first_name: 'enc_John', last_name: 'enc_Doe', dob: '1990-01-01', gender: 'male', symptom_code: 'S01', symptom_text: 'Fever', complaints: 'High fever', appointment_status: 'pending', recommended_index: 1, slot_id: 1, clinic_id: 1, appointment_date: today },
      ],
    });

    const res = await request(app)
      .get('/api/doctor/appointments/today')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0].patient_name).toBe('John Doe');
  });

  test('returns empty array if no appointments', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/doctor/appointments/today')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/appointments/:id/full
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/appointments/:id/full', () => {
  test('returns full appointment data', async () => {
    // Mock appointment lookup
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };
    let callCount = 0;
    chain.maybeSingle.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1, symptom_code: 'S01', symptom_text: 'Fever', complaints: '', appointment_status: 'in_progress', appointment_date: today, recommended_index: 1 }, error: null };
      if (callCount === 2) return { data: { doctor_id: 5, clinic_id: 1 }, error: null }; // slot ownership check
      return { data: null, error: null };
    });
    mockFrom.mockReturnValue(chain);

    // Mock parallel queries (prescription, medications, examination, testRequests)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ prescription_id: 1, chief_complain: 'Headache' }] }) // prescription
      .mockResolvedValueOnce({ rows: [] }) // medications
      .mockResolvedValueOnce({ rows: [] }) // examination
      .mockResolvedValueOnce({ rows: [] }); // testRequests

    const res = await request(app)
      .get('/api/doctor/appointments/1/full')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment).toBeDefined();
    expect(res.body.prescription).toBeDefined();
    expect(res.body.medications).toBeDefined();
  });

  test('403 if appointment belongs to different doctor', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
    };
    let callCount = 0;
    chain.maybeSingle.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      if (callCount === 2) return { data: { doctor_id: 99, clinic_id: 1 }, error: null }; // different doctor
      return { data: null, error: null };
    });
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/doctor/appointments/1/full')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(403);
  });

  test('404 if appointment not found', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/doctor/appointments/999/full')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(404);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/appointments (date range)
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/appointments', () => {
  test('returns appointments for default range (today + 30d)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { appointment_id: 1, user_id: 10, first_name: 'enc_Jane', last_name: 'enc_Smith', dob: '1990-01-01', gender: 'female', symptom_code: 'S01', symptom_text: 'Cough', complaints: '', appointment_status: 'accepted', recommended_index: 1, slot_id: 1, clinic_id: 1, clinic_name: 'City Clinic', appointment_date: tomorrow },
        { appointment_id: 2, user_id: 11, first_name: 'enc_Bob', last_name: 'enc_Lee', dob: '1985-06-15', gender: 'male', symptom_code: 'S02', symptom_text: 'Fever', complaints: '', appointment_status: 'pending', recommended_index: 2, slot_id: 2, clinic_id: 2, clinic_name: 'Metro Hospital', appointment_date: nextWeek },
      ],
    });

    const res = await request(app)
      .get('/api/doctor/appointments')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(2);
    expect(res.body.appointments[0].clinic_name).toBe('City Clinic');
    expect(res.body.appointments[1].patient_name).toBe('Bob Lee');
  });

  test('returns wider range when includePast=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/doctor/appointments?includePast=true')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(0);
    // Verify the query was called with a dateFrom in the past
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const queryArgs = mockQuery.mock.calls[0];
    const dateFrom = queryArgs[1][1]; // second param
    expect(new Date(dateFrom) < new Date()).toBe(true);
  });

  test('401 without auth token', async () => {
    const res = await request(app)
      .get('/api/doctor/appointments');

    expect(res.status).toBe(401);
  });
});
