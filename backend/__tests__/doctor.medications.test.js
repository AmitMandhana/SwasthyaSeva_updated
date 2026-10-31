const request = require('supertest');
const express = require('express');

const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({ ensureTable: jest.fn(), withTableGuard: jest.fn((fn) => fn()) }));
jest.mock('../utils/pii', () => ({ encrypt: jest.fn(v => `enc_${v}`), decrypt: jest.fn(v => v) }));
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

function token() {
  return require('jsonwebtoken').sign({ role: 'doctor', doctor_id: 5, username: 'doc' }, 'test-secret', { expiresIn: '1h' });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use('/api/doctor', require('../routes/doctorRoutes'));
});
afterEach(() => jest.clearAllMocks());

describe('Doctor — POST /api/doctor/medications', () => {
  function mockOwnership(owned = true) {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      return { data: { doctor_id: owned ? 5 : 99 }, error: null };
    });
    mockFrom.mockReturnValue(c);
  }

  test('400 if invalid medication_type', async () => {
    const res = await request(app).post('/api/doctor/medications').set('Authorization', `Bearer ${token()}`).send({
      appointmentId: 1, medicineName: 'Aspirin', medicationType: 'invalid_type', route: 'oral',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/medication_type/);
  });

  test('400 if invalid route', async () => {
    const res = await request(app).post('/api/doctor/medications').set('Authorization', `Bearer ${token()}`).send({
      appointmentId: 1, medicineName: 'Aspirin', medicationType: 'tablet', route: 'invalid_route',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/route/);
  });

  test('201 on success', async () => {
    mockOwnership(true);
    mockQuery.mockResolvedValueOnce({ rows: [{ medication_id: 1, medicine_name: 'Aspirin', medication_type: 'tablet' }] });

    const res = await request(app).post('/api/doctor/medications').set('Authorization', `Bearer ${token()}`).send({
      appointmentId: 1, medicineName: 'Aspirin', medicationType: 'tablet', route: 'oral', amount: 1, dosage: 500, frequency: 2, durationDays: 7,
    });
    expect(res.status).toBe(201);
    expect(res.body.medication).toBeDefined();
  });
});

describe('Doctor — DELETE /api/doctor/medications/:id', () => {
  test('404 if not found', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
    mockFrom.mockReturnValue(c);

    const res = await request(app).delete('/api/doctor/medications/999').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(404);
  });

  test('200 on success', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { medication_id: 1, appointment_id: 1 }, error: null };
      if (n === 2) return { data: { slot_id: 1 }, error: null };
      return { data: { doctor_id: 5 }, error: null };
    });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ medication_id: 1 }] });

    const res = await request(app).delete('/api/doctor/medications/1').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);
  });
});

describe('Doctor — GET /api/doctor/medicines', () => {
  test('200 with medicines list', async () => {
    const c = { select: jest.fn().mockReturnThis(), order: jest.fn().mockResolvedValue({ data: [{ medicine_id: 1, medicine_name: 'Paracetamol' }], error: null }) };
    mockFrom.mockReturnValue(c);

    const res = await request(app).get('/api/doctor/medicines').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.medicines).toHaveLength(1);
  });
});
