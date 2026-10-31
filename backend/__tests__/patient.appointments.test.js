const request = require('supertest');
const express = require('express');

const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));

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
const mockPool = { connect: mockConnect, query: mockQuery, end: jest.fn(), on: jest.fn() };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
jest.mock('../utils/pool', () => ({ getPool: jest.fn(() => mockPool) }));

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
const tomorrow = futureDate(1);
const pastDate = futureDate(-5);

jest.mock('../ratelimits/patientAuth', () => ({
  patientLoginRateLimit: (req, res, next) => next(),
  patientOTPRequestRateLimit: (req, res, next) => next(),
  patientOTPVerifyRateLimit: (req, res, next) => next(),
}));

function patientToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'patient', user_id: 10, first_name: 'John' }, 'test-secret', { expiresIn: '1h' });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const patientRoutes = require('../routes/patientRoutes');
  app.use('/api/patient', patientRoutes);
});

afterEach(() => { jest.clearAllMocks(); });

describe('Patient — GET /api/patient/appointments', () => {
  test('401 without auth token', async () => {
    const res = await request(app).get('/api/patient/appointments');
    expect(res.status).toBe(401);
  });

  test('returns upcoming appointments by default', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          appointment_id: 1, appointment_date: tomorrow, appointment_status: 'accepted',
          symptom_text: 'Fever', complaints: '', slot_day: 'THU', slot_start: 18, slot_end: 20, slot_fee: 500,
          doctor_first_name: 'enc_Priya', doctor_last_name: 'enc_Das',
          clinic_name: 'City Clinic', has_prescription: false,
        },
      ],
    });

    const res = await request(app)
      .get('/api/patient/appointments')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0].doctor_name).toBe('Priya Das');
    expect(res.body.appointments[0].has_prescription).toBe(false);
  });

  test('returns past appointments with status=past', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/patient/appointments?status=past')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(0);
  });

  test('filters by hasPrescription=true', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          appointment_id: 5, appointment_date: pastDate, appointment_status: 'completed',
          symptom_text: 'Cough', complaints: '', slot_day: 'MON', slot_start: 10, slot_end: 12, slot_fee: 300,
          doctor_first_name: 'enc_Anil', doctor_last_name: 'enc_K',
          clinic_name: 'Metro Hospital', has_prescription: true,
        },
      ],
    });

    const res = await request(app)
      .get('/api/patient/appointments?status=past&hasPrescription=true')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments[0].has_prescription).toBe(true);
  });
});
