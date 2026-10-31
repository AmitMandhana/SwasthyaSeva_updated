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

describe('Doctor — POST /api/doctor/prescriptions/save', () => {
  function mockOwnership(owned = true) {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, user_id: 10, slot_id: 1 }, error: null };
      if (n === 2) return { data: { doctor_id: owned ? 5 : 99 }, error: null };
      if (n === 3) return { data: { signature_link: 'https://cloudinary.com/sig.png' }, error: null };
      return { data: null, error: null };
    });
    mockFrom.mockReturnValue(c);
  }

  test('400 if chiefComplain missing', async () => {
    const res = await request(app).post('/api/doctor/prescriptions/save').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/chiefComplain/);
  });

  test('400 if provisionalDiagnosis missing', async () => {
    const res = await request(app).post('/api/doctor/prescriptions/save').set('Authorization', `Bearer ${token()}`).send({ appointmentId: 1, chiefComplain: 'test' });
    expect(res.status).toBe(400);
  });

  test('403 if not owned', async () => {
    mockOwnership(false);
    const res = await request(app).post('/api/doctor/prescriptions/save').set('Authorization', `Bearer ${token()}`).send({
      appointmentId: 1, chiefComplain: 'Head', provisionalDiagnosis: 'Migraine', duration: 7, refills: 0,
    });
    expect(res.status).toBe(403);
  });

  test('200 on success', async () => {
    mockOwnership(true);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ prescription_id: 1, chief_complain: 'Head' }] }) // upsert
      .mockResolvedValueOnce({ rows: [] }); // update appointment status

    const res = await request(app).post('/api/doctor/prescriptions/save').set('Authorization', `Bearer ${token()}`).send({
      appointmentId: 1, chiefComplain: 'Head', provisionalDiagnosis: 'Migraine', duration: 7, refills: 0,
    });
    expect(res.status).toBe(200);
    expect(res.body.prescription).toBeDefined();
  });
});

describe('Doctor — DELETE /api/doctor/prescriptions/:id/all', () => {
  test('403 if not owned', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, slot_id: 1 }, error: null };
      return { data: { doctor_id: 99 }, error: null };
    });
    mockFrom.mockReturnValue(c);

    const res = await request(app).delete('/api/doctor/prescriptions/1/all').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(403);
  });

  test('200 on success', async () => {
    const c = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn() };
    let n = 0;
    c.maybeSingle.mockImplementation(() => {
      n++;
      if (n === 1) return { data: { appointment_id: 1, slot_id: 1 }, error: null };
      return { data: { doctor_id: 5 }, error: null };
    });
    mockFrom.mockReturnValue(c);
    mockQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // DELETE medications
      .mockResolvedValueOnce({}) // DELETE test_requests
      .mockResolvedValueOnce({}) // DELETE examination_records
      .mockResolvedValueOnce({}) // DELETE prescriptions
      .mockResolvedValueOnce({}) // COMMIT
      .mockResolvedValueOnce({}); // UPDATE appointment status

    const res = await request(app).delete('/api/doctor/prescriptions/1/all').set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cleared/i);
  });
});
