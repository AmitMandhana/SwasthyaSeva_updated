const request = require('supertest');
const express = require('express');

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
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ connect: mockConnect })),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_new'),
}));

function doctorToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'doctor', doctor_id: 5, username: 'drdoe' }, 'test-secret', { expiresIn: '1h' });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const doctorRoutes = require('../routes/doctorRoutes');
  app.use('/api/doctor', doctorRoutes);
});

afterEach(() => { jest.clearAllMocks(); });

describe('Doctor — GET /api/doctor/profile', () => {
  test('returns doctor profile (200)', async () => {
    let callCount = 0;
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(function () {
        // getDoctorExtraQualifications uses .order() and resolves directly
        return Promise.resolve({ data: [], error: null });
      }),
      maybeSingle: jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // getProfile doctors query
          return Promise.resolve({
            data: {
              doctor_id: 5, username: 'drdoe', first_name: 'enc_John', last_name: 'enc_Doe',
              pfp_link: null, bio: 'Test bio', license_no: 'LIC123', verified_doctor: true,
              base_degree: { name: 'MBBS' }, postgrad: null, super_spec: null,
              tag1_ref: { name: 'General' }, tag2_ref: null, tag3_ref: null,
              password_hash: 'xxx', is_deleted: false, created_at: '2026-01-01',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe('drdoe');
    expect(res.body.profile.password_hash).toBeUndefined();
  });
});

describe('Doctor — PATCH /api/doctor/profile', () => {
  test('400 when nothing to update', async () => {
    const res = await request(app)
      .patch('/api/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken()}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('400 on wrong current password', async () => {
    const bcrypt = require('bcrypt');
    bcrypt.compare.mockResolvedValueOnce(false);

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { password_hash: 'old_hash' }, error: null }),
      update: jest.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken()}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpass123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('incorrect');
  });

  test('200 on successful password change', async () => {
    const bcrypt = require('bcrypt');
    bcrypt.compare.mockResolvedValueOnce(true);

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { password_hash: 'old_hash' }, error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/doctor/profile')
      .set('Authorization', `Bearer ${doctorToken()}`)
      .send({ currentPassword: 'correct', newPassword: 'newpass123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Profile updated');
  });
});
