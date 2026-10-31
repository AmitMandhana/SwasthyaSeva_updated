const request = require('supertest');
const express = require('express');

// Mock Supabase
const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
  };
});

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });
const mockPoolEnd = jest.fn().mockResolvedValue(undefined);
const mockPool = { connect: mockConnect, query: mockQuery, end: mockPoolEnd, on: jest.fn() };
jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));
jest.mock('../utils/pool', () => ({
  getPool: jest.fn(() => mockPool),
}));

function doctorToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'doctor', doctor_id: 5, username: 'drdoe' }, 'test-secret', { expiresIn: '1h' });
}

function setupChain(data, error = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
    limit: jest.fn().mockResolvedValue({ data: data ? [data] : [], error }),
  };
  return chain;
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
// PATCH /api/doctor/appointments/:id/resolve
// ───────────────────────────────────────────────────────────────

describe('Doctor — PATCH /api/doctor/appointments/:id/resolve', () => {
  test('resolves an accepted appointment', async () => {
    let callCount = 0;
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { data: { appointment_id: 1, slot_id: 1, appointment_status: 'accepted' }, error: null };
        if (callCount === 2) return { data: { doctor_id: 5 }, error: null };
        return { data: null, error: null };
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/appointments/1/resolve')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Appointment resolved');
  });

  test('rejects resolving a completed appointment', async () => {
    let callCount = 0;
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { data: { appointment_id: 1, slot_id: 1, appointment_status: 'completed' }, error: null };
        if (callCount === 2) return { data: { doctor_id: 5 }, error: null };
        return { data: null, error: null };
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/appointments/1/resolve')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(400);
  });

  test('rejects without auth', async () => {
    const res = await request(app)
      .patch('/api/doctor/appointments/1/resolve');

    expect(res.status).toBe(401);
  });

  test('returns 403 for another doctor\'s appointment', async () => {
    let callCount = 0;
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { data: { appointment_id: 1, slot_id: 1, appointment_status: 'accepted' }, error: null };
        if (callCount === 2) return { data: { doctor_id: 999 }, error: null };
        return { data: null, error: null };
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/appointments/1/resolve')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(403);
  });
});

// ───────────────────────────────────────────────────────────────
// PATCH /api/doctor/appointments/:id/complete
// ───────────────────────────────────────────────────────────────

describe('Doctor — PATCH /api/doctor/appointments/:id/complete', () => {
  test('completes an appointment', async () => {
    let callCount = 0;
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { data: { appointment_id: 1, slot_id: 1 }, error: null };
        if (callCount === 2) return { data: { doctor_id: 5 }, error: null };
        return { data: null, error: null };
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/appointments/1/complete')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Appointment completed');
  });

  test('returns 404 for nonexistent appointment', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/appointments/999/complete')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(404);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/dashboard-summary
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/dashboard-summary', () => {
  test('returns dashboard summary', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ slot_id: 1, slot_day: 'MON', slot_start: 12, slot_end: 18, slot_fee: 300, clinic_id: 1, clinic_name: 'TestClinic', patient_count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ total: '5', completed: '3', accepted: '2', pending: '0' }] })
      .mockResolvedValueOnce({ rows: [{ slot_id: 1, slot_day: 'MON', slot_start: 12, slot_end: 18, slot_fee: 300, clinic_id: 1, clinic_name: 'TestClinic', patient_count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ first_time: '1', follow_up: '2' }] })
      .mockResolvedValueOnce({ rows: [{ total: '5', completed: '3' }] })
      .mockResolvedValueOnce({ rows: [{ total: '3', completed: '2' }] });

    const res = await request(app)
      .get('/api/doctor/dashboard-summary')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.todaySlots).toHaveLength(1);
    expect(res.body.todaySlots[0].patient_count).toBe(3);
    expect(res.body.unresolvedCount).toBe(2);
    expect(res.body.todayStats.total).toBe(5);
    expect(res.body.todayStats.completed).toBe(3);
  });

  test('rejects without auth', async () => {
    const res = await request(app).get('/api/doctor/dashboard-summary');
    expect(res.status).toBe(401);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/patients
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/patients', () => {
  test('returns patient list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 1, first_name: 'enc_John', last_name: 'enc_Doe', gender: 'male', dob: '1990-01-01', last_visit: '2026-05-01', total_visits: '5' },
        { user_id: 2, first_name: 'enc_Jane', last_name: 'enc_Smith', gender: 'female', dob: '1985-06-15', last_visit: '2026-04-20', total_visits: '3' },
      ],
    });

    const res = await request(app)
      .get('/api/doctor/patients')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(2);
    expect(res.body.patients[0].patient_name).toBe('John Doe');
    expect(res.body.patients[0].total_visits).toBe(5);
  });

  test('filters by search query', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { user_id: 1, first_name: 'enc_John', last_name: 'enc_Doe', gender: 'male', dob: '1990-01-01', last_visit: '2026-05-01', total_visits: '5' },
        { user_id: 2, first_name: 'enc_Jane', last_name: 'enc_Smith', gender: 'female', dob: '1985-06-15', last_visit: '2026-04-20', total_visits: '3' },
      ],
    });

    const res = await request(app)
      .get('/api/doctor/patients?search=jane')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.patients).toHaveLength(1);
    expect(res.body.patients[0].patient_name).toBe('Jane Smith');
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/patients/:userId/prescription-history
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/patients/:userId/prescription-history', () => {
  test('returns prescription history', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          prescription_id: 10, chief_complain: 'Fever', significant_medical_history: 'None',
          provisional_diagnosis: 'Viral fever', final_diagnosis: 'Viral pyrexia',
          duration: 5, appointment_date: '2026-04-01', symptom_text: 'High fever',
          complaints: 'Body aches', doctor_id: 5, doctor_first_name: 'Dr', doctor_last_name: 'Doe',
          doctor_username: 'drdoe', clinic_id: 1, clinic_name: 'TestClinic', clinic_username: 'testclinic',
          medications: [{ medicine_name: 'Paracetamol', amount: 500, frequency: 3, duration_days: 5 }],
        },
      ],
    });

    const res = await request(app)
      .get('/api/doctor/patients/10/prescription-history')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
    expect(res.body.history[0].chief_complain).toBe('Fever');
    expect(res.body.history[0].doctor_first_name).toBe('Dr');
    expect(res.body.history[0].clinic_name).toBe('TestClinic');
  });

  test('returns 400 for invalid userId', async () => {
    const res = await request(app)
      .get('/api/doctor/patients/abc/prescription-history')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(400);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/clinics
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/clinics', () => {
  test('returns unique clinics', async () => {
    const slotsData = [
      { slot_id: 1, clinic_id: 1, slot_day: 'MON', slot_start: 12, slot_end: 18, slot_fee: 300, booking_fee: 0, is_deleted: false, created_at: '2026-01-01', doctor: { username: 'drdoe', first_name: 'Dr', last_name: 'Doe', tag_1: null, tag_2: null, tag_3: null }, clinic: { username: 'cityhealth', clinic_name: 'CityHealth', city: 'Kolkata' } },
      { slot_id: 2, clinic_id: 1, slot_day: 'WED', slot_start: 12, slot_end: 18, slot_fee: 300, booking_fee: 0, is_deleted: false, created_at: '2026-01-01', doctor: { username: 'drdoe', first_name: 'Dr', last_name: 'Doe', tag_1: null, tag_2: null, tag_3: null }, clinic: { username: 'cityhealth', clinic_name: 'CityHealth', city: 'Kolkata' } },
      { slot_id: 3, clinic_id: 2, slot_day: 'FRI', slot_start: 12, slot_end: 18, slot_fee: 400, booking_fee: 0, is_deleted: false, created_at: '2026-01-01', doctor: { username: 'drdoe', first_name: 'Dr', last_name: 'Doe', tag_1: null, tag_2: null, tag_3: null }, clinic: { username: 'medcare', clinic_name: 'MedCare', city: 'Kolkata' } },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: slotsData, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/doctor/clinics')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.clinics).toHaveLength(2);
    expect(res.body.clinics.map(c => c.clinic_name).sort()).toEqual(['CityHealth', 'MedCare']);
  });
});

// ───────────────────────────────────────────────────────────────
// GET /api/doctor/slots
// ───────────────────────────────────────────────────────────────

describe('Doctor — GET /api/doctor/slots', () => {
  test('returns doctor slots', async () => {
    const slotsData = [
      { slot_id: 1, clinic_id: 1, doctor_id: 5, slot_day: 'MON', slot_start: 12, slot_end: 18, slot_fee: 300, booking_fee: 0, is_deleted: false, created_at: '2026-01-01', doctor: { username: 'drdoe', first_name: 'Dr', last_name: 'Doe', tag_1: null, tag_2: null, tag_3: null }, clinic: { username: 'cityhealth', clinic_name: 'CityHealth', city: 'Kolkata' } },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: slotsData, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/doctor/slots')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(1);
    expect(res.body.slots[0].slot_day).toBe('MON');
    expect(res.body.slots[0].clinic_name).toBe('CityHealth');
  });
});
