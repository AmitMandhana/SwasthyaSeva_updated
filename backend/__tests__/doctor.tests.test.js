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

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
const today = futureDate(0);

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

describe('Doctor — POST /api/doctor/test-requests', () => {
  test('400 if testName empty', async () => {
    const res = await request(app).post('/api/doctor/test-requests').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1 });
    expect(res.status).toBe(400);
  });

  test('201 on success', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      return { data: { doctor_id: 5 }, error: null };
    });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ request_id: 1, test_name: 'Blood Test' }] });

    const res = await request(app).post('/api/doctor/test-requests').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1, testName: 'Blood Test' });
    expect(res.status).toBe(201);
    expect(res.body.testRequest).toBeDefined();
  });
});

describe('Doctor — DELETE /api/doctor/test-requests/:id', () => {
  test('404 if not found', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
    mockFrom.mockReturnValue(c);
    const res = await request(app).delete('/api/doctor/test-requests/999').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(404);
  });

  test('200 on success', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { request_id: 1, appointment_id: 1 }, error: null };
      if (n === 2) return { data: { slot_id: 1 }, error: null };
      return { data: { doctor_id: 5 }, error: null };
    });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ request_id: 1 }] });

    const res = await request(app).delete('/api/doctor/test-requests/1').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
  });
});

describe('Doctor — GET /api/doctor/patients/:userId/test-results', () => {
  test('403 if no relationship', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: jest.fn() };
    mockFrom.mockReturnValue(c);
    const res = await request(app).get('/api/doctor/patients/10/test-results').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(403);
  });

  test('200 with results', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), limit: jest.fn(), maybeSingle: jest.fn() };
    c.limit.mockResolvedValue({ data: [{ appointment_id: 1, slot_id: 1 }], error: null });
    c.maybeSingle.mockResolvedValue({ data: { doctor_id: 5 }, error: null });
    mockFrom.mockReturnValue(c);
    mockQuery.mockResolvedValueOnce({ rows: [{ request_id: 1, test_name: 'CBC', test_report_link: 'https://link.com', test_date: today }] });

    const res = await request(app).get('/api/doctor/patients/10/test-results').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
  });
});
