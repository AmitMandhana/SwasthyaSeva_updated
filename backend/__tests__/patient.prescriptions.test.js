const request = require('supertest');
const express = require('express');

const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({ ensureTable: jest.fn(), withTableGuard: jest.fn((fn) => fn()) }));
jest.mock('../utils/pii', () => ({ encrypt: jest.fn(v => `enc_${v}`), decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v) }));
jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));
jest.mock('../ratelimits/patientAuth', () => ({
  patientLoginRateLimit: (req, res, next) => next(),
  patientOTPRequestRateLimit: (req, res, next) => next(),
  patientOTPVerifyRateLimit: (req, res, next) => next(),
}));
jest.mock('../utils/msg/sendSMSOTP', () => jest.fn(() => true));
jest.mock('bcrypt', () => ({ compare: jest.fn() }));
jest.mock('../jwt', () => {
  const jwt = require('jsonwebtoken');
  return {
    generateToken: jest.fn((p) => jwt.sign(p, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((t) => { try { return jwt.verify(t, 'test-secret'); } catch { return null; } }),
  };
});

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockPool = { connect: jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease }), query: mockQuery, end: jest.fn(), on: jest.fn() };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));
jest.mock('../utils/pool', () => ({ getPool: jest.fn(() => mockPool) }));

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
const pastDate = futureDate(-5);

function patientToken(userId = 42) {
  return require('jsonwebtoken').sign({ role: 'patient', user_id: userId, name: 'Test' }, 'test-secret', { expiresIn: '1h' });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use('/api/patient', require('../routes/patientRoutes'));
});
afterEach(() => jest.clearAllMocks());

describe('Patient — GET /api/patient/prescriptions', () => {
  test('401 if no token', async () => {
    const res = await request(app).get('/api/patient/prescriptions');
    expect(res.status).toBe(401);
  });

  test('200 with prescriptions list', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        appointment_id: 1, chief_complain: 'Headache', appointment_date: pastDate,
        appointment_status: 'completed', doctor_first_name: 'Jane', doctor_last_name: 'Doe',
        clinic_name: 'City Clinic',
      }],
    });

    const res = await request(app).get('/api/patient/prescriptions').set('Authorization', `Bearer ${patientToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.prescriptions).toHaveLength(1);
    expect(res.body.prescriptions[0].doctorName).toMatch(/Dr\./);
    expect(res.body.total).toBe(1);
  });
});

describe('Patient — GET /api/patient/prescriptions/:appointmentId', () => {
  test('403 if not owner', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        prescription_id: 1, user_id: 999, chief_complain: 'X', appointment_date: pastDate,
        appointment_status: 'completed', doctor_first_name: 'A', doctor_last_name: 'B',
        clinic_name: 'C', clinic_address: 'D', clinic_phone: '123', slot_id: 1,
        clinic_id: 1, doctor_id: 1, license_no: 'L1', signature_link: null,
        base_degree_code: 'MBBS', symptom_text: '', complaints: '',
        significant_medical_history: null, other_findings: null,
        provisional_diagnosis: 'PD', final_diagnosis: null, prognosis: null,
        duration: 7, refills: 0, digital_signature: null,
      }],
    });

    const res = await request(app).get('/api/patient/prescriptions/1').set('Authorization', `Bearer ${patientToken(42)}`);
    expect(res.status).toBe(403);
  });

  test('404 if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/patient/prescriptions/999').set('Authorization', `Bearer ${patientToken()}`);
    expect(res.status).toBe(404);
  });

  test('200 with full detail', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{
        prescription_id: 1, user_id: 42, chief_complain: 'Headache',
        appointment_date: pastDate, appointment_status: 'completed',
        doctor_first_name: 'Jane', doctor_last_name: 'Doe', clinic_name: 'CC',
        clinic_address: '123 St', clinic_phone: '555', slot_id: 1, clinic_id: 1,
        doctor_id: 1, license_no: 'L1', signature_link: 'https://sig.png',
        base_degree_code: 'MBBS', symptom_text: 'Fever', complaints: 'High',
        significant_medical_history: null, other_findings: null,
        provisional_diagnosis: 'Migraine', final_diagnosis: 'Migraine',
        prognosis: 'Good', duration: 7, refills: 0, digital_signature: 'sig',
      }] })
      .mockResolvedValueOnce({ rows: [{ medication_id: 1, medicine_name: 'Aspirin' }] }) // medications
      .mockResolvedValueOnce({ rows: [{ examination_id: 1, height: 170 }] }) // examination
      .mockResolvedValueOnce({ rows: [] }); // test requests

    const res = await request(app).get('/api/patient/prescriptions/1').set('Authorization', `Bearer ${patientToken(42)}`);
    expect(res.status).toBe(200);
    expect(res.body.prescription).toBeDefined();
    expect(res.body.medications).toHaveLength(1);
    expect(res.body.doctor.name).toMatch(/Dr\./);
    expect(res.body.examination).toBeDefined();
  });
});
