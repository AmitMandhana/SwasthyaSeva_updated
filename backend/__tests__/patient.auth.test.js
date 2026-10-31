const request = require('supertest');
const express = require('express');

// Mock Supabase
const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

// Force DEV_MODE off so cooldown logic is testable
jest.mock('../config/env', () => ({ DEV_MODE: false }));

// Mock rate limiters
jest.mock('../ratelimits/patientAuth', () => ({
  patientLoginRateLimit: (req, res, next) => next(),
  patientOTPRequestRateLimit: (req, res, next) => next(),
  patientOTPVerifyRateLimit: (req, res, next) => next(),
}));

// Mock SMS — capture OTP
let capturedOTP = null;
jest.mock('../utils/msg/sendSMSOTP', () =>
  jest.fn((otp) => { capturedOTP = otp; return true; })
);

// Mock PII
jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

// Mock hashForSearch
jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));

// Access the pending OTP store to clear it between tests
const pendingStore = require('../utils/pendingPatientOTPs');

// Mock JWT
const mockJwtSecret = 'test-secret';
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
  };
});

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
const bcrypt = require('bcrypt');

// Build app
let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const patientRoutes = require('../routes/patientRoutes');
  app.use('/api/patient', patientRoutes);
});

function setupSupabaseMock(returnData, returnError = null) {
  const chainMock = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    limit: jest.fn().mockResolvedValue({ data: returnData ? [returnData] : [], error: returnError }),
  };
  mockFrom.mockReturnValue(chainMock);
  return chainMock;
}

// ───────────────────────────────────────────────────────────────
// POST /api/patient/login
// ───────────────────────────────────────────────────────────────

describe('Patient auth — POST /api/patient/login', () => {
  afterEach(() => jest.clearAllMocks());

  test('missing fields → 400', async () => {
    const res = await request(app).post('/api/patient/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('user not found → 401', async () => {
    setupSupabaseMock(null);
    const res = await request(app).post('/api/patient/login').send({
      first_name: 'John', last_name: 'Doe', phone: '9876543210', password: 'pass123',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('wrong password → 401', async () => {
    setupSupabaseMock({ user_id: 1, first_name: 'enc_John', password_hash: '$hash', phone_hash: 'h', name_hash: 'n' });
    bcrypt.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/patient/login').send({
      first_name: 'John', last_name: 'Doe', phone: '9876543210', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('valid credentials → 200 with token', async () => {
    setupSupabaseMock({ user_id: 42, first_name: 'enc_John', password_hash: '$hash', phone_hash: 'h', name_hash: 'n' });
    bcrypt.compare.mockResolvedValue(true);
    const res = await request(app).post('/api/patient/login').send({
      first_name: 'John', last_name: 'Doe', phone: '9876543210', password: 'correct',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.user_id).toBe(42);
  });
});

// ───────────────────────────────────────────────────────────────
// POST /api/patient/request-otp
// ───────────────────────────────────────────────────────────────

describe('Patient auth — POST /api/patient/request-otp', () => {
  afterEach(() => {
    jest.clearAllMocks();
    capturedOTP = null;
    pendingStore.clearAll();
  });

  test('missing fields → 400', async () => {
    const res = await request(app).post('/api/patient/request-otp').send({});
    expect(res.status).toBe(400);
  });

  test('user not found → 404', async () => {
    setupSupabaseMock(null);
    const res = await request(app).post('/api/patient/request-otp').send({
      first_name: 'Ghost', last_name: 'User', phone: '1111111111',
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('valid user → 200 + OTP sent', async () => {
    setupSupabaseMock({ user_id: 10, first_name: 'enc_Jane' });
    const res = await request(app).post('/api/patient/request-otp').send({
      first_name: 'Jane', last_name: 'Smith', phone: '2222222222',
    });
    expect(res.body).toMatchObject({ message: 'OTP sent' });
    expect(res.status).toBe(200);
    const sendSMSOTP = require('../utils/msg/sendSMSOTP');
    expect(sendSMSOTP).toHaveBeenCalled();
  });

  test('resend within cooldown → 429', async () => {
    setupSupabaseMock({ user_id: 10, first_name: 'enc_Jane' });
    // First request succeeds
    await request(app).post('/api/patient/request-otp').send({
      first_name: 'Jane', last_name: 'Smith', phone: '3333333333',
    });
    // Second request within 60s → 429
    const res = await request(app).post('/api/patient/request-otp').send({
      first_name: 'Jane', last_name: 'Smith', phone: '3333333333',
    });
    expect(res.status).toBe(429);
    expect(res.body.retryAfter).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────
// POST /api/patient/verify-otp
// ───────────────────────────────────────────────────────────────

describe('Patient auth — POST /api/patient/verify-otp', () => {
  afterEach(() => {
    jest.clearAllMocks();
    capturedOTP = null;
    pendingStore.clearAll();
  });

  test('missing fields → 400', async () => {
    const res = await request(app).post('/api/patient/verify-otp').send({});
    expect(res.status).toBe(400);
  });

  test('no pending OTP → 400', async () => {
    const res = await request(app).post('/api/patient/verify-otp').send({
      first_name: 'Nobody', last_name: 'Here', phone: '1111111111', otp: '123456',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no pending/i);
  });

  test('wrong OTP → 401 with remaining attempts', async () => {
    // First request OTP to populate the store
    setupSupabaseMock({ user_id: 20, first_name: 'enc_Test' });
    await request(app).post('/api/patient/request-otp').send({
      first_name: 'Test', last_name: 'Otp', phone: '5555555555',
    });

    const res = await request(app).post('/api/patient/verify-otp').send({
      first_name: 'Test', last_name: 'Otp', phone: '5555555555', otp: '000000',
    });
    expect(res.status).toBe(401);
    expect(res.body.attemptsRemaining).toBeDefined();
  });

  test('correct OTP → 200 with token', async () => {
    // Request OTP
    setupSupabaseMock({ user_id: 30, first_name: 'enc_Good' });
    await request(app).post('/api/patient/request-otp').send({
      first_name: 'Good', last_name: 'User', phone: '7777777777',
    });

    // Get the OTP from the mock
    const sendSMSOTP = require('../utils/msg/sendSMSOTP');
    const otp = sendSMSOTP.mock.calls[sendSMSOTP.mock.calls.length - 1][0];

    const res = await request(app).post('/api/patient/verify-otp').send({
      first_name: 'Good', last_name: 'User', phone: '7777777777', otp,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.user_id).toBe(30);
  });
});
