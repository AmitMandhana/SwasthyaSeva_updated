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

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_new'),
}));

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });
jest.mock('pg', () => ({ Pool: jest.fn(() => ({ connect: mockConnect })) }));

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

describe('Patient — GET /api/patient/profile', () => {
  test('returns patient profile (200)', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          user_id: 10, first_name: 'enc_John', last_name: 'enc_Doe',
          phone: 'enc_1234567890', email: 'enc_john@test.com',
          dob: '1990-01-01', gender: 'male', pfp_link: null,
          city: 'Mumbai', state: 'MH', country: 'India',
        },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/patient/profile')
      .set('Authorization', `Bearer ${patientToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.first_name).toBe('John');
    expect(res.body.profile.phone).toBe('1234567890');
  });

  test('401 without token', async () => {
    const res = await request(app).get('/api/patient/profile');
    expect(res.status).toBe(401);
  });
});

describe('Patient — PATCH /api/patient/profile', () => {
  test('400 on wrong current password', async () => {
    const bcrypt = require('bcrypt');
    bcrypt.compare.mockResolvedValueOnce(false);

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { password_hash: 'old_hash' }, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const res = await request(app)
      .patch('/api/patient/profile')
      .set('Authorization', `Bearer ${patientToken()}`)
      .send({ currentPassword: 'wrong', newPassword: 'newpass123' });

    expect(res.status).toBe(400);
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
      .patch('/api/patient/profile')
      .set('Authorization', `Bearer ${patientToken()}`)
      .send({ currentPassword: 'correct', newPassword: 'newpass123' });

    expect(res.status).toBe(200);
  });
});
