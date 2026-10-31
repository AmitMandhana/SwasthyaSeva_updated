const request = require('supertest');
const express = require('express');

const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({ ensureTable: jest.fn(), withTableGuard: jest.fn((fn) => fn()) }));
jest.mock('../utils/pii', () => ({ encrypt: jest.fn(v => `enc_${v}`), decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v) }));
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
const today = futureDate(0);

function token() {
  return require('jsonwebtoken').sign({ role: 'doctor', doctor_id: 5, username: 'doc' }, 'test-secret', { expiresIn: '1h' });
}

function mockChain(data, err = null) {
  const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(), limit: jest.fn() };
  c.maybeSingle.mockResolvedValue({ data, error: err });
  c.limit.mockResolvedValue({ data: data ? [data] : [], error: err });
  mockFrom.mockReturnValue(c);
  return c;
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use('/api/doctor', require('../routes/doctorRoutes'));
});
afterEach(() => jest.clearAllMocks());

describe('Doctor — POST /api/doctor/examination', () => {
  test('400 if appointmentId missing', async () => {
    const res = await request(app).post('/api/doctor/examination').set('Authorization', `Bearer ${token()}`).send({});
    expect(res.status).toBe(400);
  });

  test('403 if not owned', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      return { data: { doctor_id: 99 }, error: null }; // different doctor
    });
    mockFrom.mockReturnValue(c);

    const res = await request(app).post('/api/doctor/examination').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1, height: 170 });
    expect(res.status).toBe(403);
  });

  test('200 on successful upsert', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      return { data: { doctor_id: 5 }, error: null };
    });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ examination_id: 1, height: 170, weight: 70 }] });

    const res = await request(app).post('/api/doctor/examination').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1, height: 170, weight: 70 });
    expect(res.status).toBe(200);
    expect(res.body.examination).toBeDefined();
  });
});

describe('Doctor — GET /api/doctor/patients/:userId/vitals-history', () => {
  test('403 if no relationship', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(), limit: jest.fn() };
    c.limit.mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(c);

    const res = await request(app).get('/api/doctor/patients/10/vitals-history').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(403);
  });

  test('200 with history', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn(), limit: jest.fn() };
    let n = 0;
    c.limit.mockResolvedValue({ data: [{ appointment_id: 1, slot_id: 1 }], error: null });
    c.maybeSingle.mockResolvedValue({ data: { doctor_id: 5 }, error: null });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ examination_id: 1, height: 170, weight: 70, appointment_date: today }] });

    const res = await request(app).get('/api/doctor/patients/10/vitals-history').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(1);
  });
});
