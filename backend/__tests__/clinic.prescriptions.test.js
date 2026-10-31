const request = require('supertest');
const express = require('express');

const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({ ensureTable: jest.fn(), withTableGuard: jest.fn((fn) => fn()) }));
jest.mock('../utils/pii', () => ({ encrypt: jest.fn(v => `enc_${v}`), decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v) }));
jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));
jest.mock('../utils/msg/sendSMSOTP', () => jest.fn(() => true));
jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));
jest.mock('../middleware/clinicAuditLog', () => ({ clinicAuditLog: (req, res, next) => next() }));
jest.mock('../ratelimits/booking', () => ({
  bookingLookupLimit: (req, res, next) => next(),
  bookingOTPSendLimit: (req, res, next) => next(),
  bookingOTPVerifyLimit: (req, res, next) => next(),
}));
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

function clinicToken() {
  return require('jsonwebtoken').sign({ role: 'clinic', clinic_id: 8, name: 'Test Clinic' }, 'test-secret', { expiresIn: '1h' });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use('/api/clinic', require('../routes/clinicRoutes'));
});
afterEach(() => jest.clearAllMocks());

describe('Clinic — GET /api/clinic/prescriptions', () => {
  test('200 with metadata list', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '3' }] }) // count
      .mockResolvedValueOnce({
        rows: [{
          appointment_id: 1, chief_complain: 'Head', appointment_date: pastDate,
          appointment_status: 'completed', patient_first_name: 'enc_John',
          patient_last_name: 'enc_Doe', doctor_first_name: 'Jane', doctor_last_name: 'Smith',
        }],
      }); // data

    const res = await request(app).get('/api/clinic/prescriptions').set('Authorization', `Bearer ${clinicToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.prescriptions).toHaveLength(1);
    expect(res.body.prescriptions[0].patientName).toBe('John Doe');
    expect(res.body.total).toBe(3);
    // Verify no sensitive fields
    expect(res.body.prescriptions[0].medications).toBeUndefined();
    expect(res.body.prescriptions[0].medicalHistory).toBeUndefined();
  });
});

describe('Clinic — GET /api/clinic/prescriptions/:appointmentId', () => {
  test('403 if not this clinic', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        appointment_id: 1, chief_complain: 'X', final_diagnosis: 'Y',
        appointment_date: pastDate, appointment_status: 'completed',
        patient_first_name: 'enc_A', patient_last_name: 'enc_B',
        doctor_first_name: 'C', doctor_last_name: 'D',
        clinic_id: 999, // different clinic
      }],
    });

    const res = await request(app).get('/api/clinic/prescriptions/1').set('Authorization', `Bearer ${clinicToken()}`);
    expect(res.status).toBe(403);
  });

  test('200 with metadata only', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{
          appointment_id: 1, chief_complain: 'Headache', final_diagnosis: 'Migraine',
          appointment_date: pastDate, appointment_status: 'completed',
          patient_first_name: 'enc_John', patient_last_name: 'enc_Doe',
          doctor_first_name: 'Jane', doctor_last_name: 'Smith',
          clinic_id: 8,
        }],
      }) // main query
      .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // medication count
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // test request count

    const res = await request(app).get('/api/clinic/prescriptions/1').set('Authorization', `Bearer ${clinicToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.chiefComplain).toBe('Headache');
    expect(res.body.medicationCount).toBe(3);
    expect(res.body.testRequestCount).toBe(1);
    // Verify restricted — no medication details
    expect(res.body.medications).toBeUndefined();
    expect(res.body.vitals).toBeUndefined();
  });
});
