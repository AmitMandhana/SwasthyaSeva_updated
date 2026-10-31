const request = require('supertest');
const express = require('express');

// Mock Supabase before loading any modules that use it
jest.mock('../db', () => ({
  from: jest.fn(),
}));

// Mock ensureTable so withTableGuard just calls the queryFn directly
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

// Mock JWT so jwt.js doesn't throw on missing JWT_SECRET
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
    extractUserId: jest.fn(),
  };
});

// Mock active token checks
jest.mock('../queries/create/createActiveToken', () => ({
  hashToken: jest.fn(() => 'hashed'),
  storeActiveToken: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../queries/read/getActiveTokens', () => ({
  isTokenActive: jest.fn().mockResolvedValue(true),
}));

// Mock rate limiter to prevent 429 errors in tests
jest.mock('../ratelimits/adminLogin', () => ({
  adminLoginRateLimit: (req, res, next) => next(),
}));

const supabase = require('../db');

// ---------------------------------------------------------------------------
// Build a minimal test app
// ---------------------------------------------------------------------------

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const adminRoutes = require('../routes/adminRoutes');
  app.use('/api/admin', adminRoutes);

  // A stub protected route so we can test the middleware
  const { requireAdmin } = require('../middleware/adminAuth');
  app.get('/api/admin/protected-test', requireAdmin, (req, res) => {
    res.status(200).json({ ok: true, adminId: req.adminId });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAdminRow(overrides = {}) {
  const bcrypt = require('bcrypt');
  // Pre-computed bcrypt hash of 'correctpassword123' with 1 round (fast for tests)
  return {
    admin_id: 1,
    username: 'testadmin',
    // Will be set per test that needs a valid hash
    password_hash: '$2b$01$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    ...overrides,
  };
}

function setupSupabaseMock(returnData, returnError = null) {
  const chainMock = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
  };
  supabase.from.mockReturnValue(chainMock);
  return chainMock;
}

// ---------------------------------------------------------------------------
// Tests: POST /api/admin/login
// ---------------------------------------------------------------------------

describe('Admin auth — POST /api/admin/login', () => {
  afterEach(() => jest.clearAllMocks());

  test('missing fields → 400 with issues array', async () => {
    const res = await request(app).post('/api/admin/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  test('missing password → 400 with issues', async () => {
    const res = await request(app).post('/api/admin/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('unknown username → 401', async () => {
    setupSupabaseMock(null);
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'nobody', password: 'somepassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('wrong password → 401', async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('correctpassword123', 1);
    setupSupabaseMock(mockAdminRow({ password_hash: hash }));

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('correct credentials → 200 with token', async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('correctpassword123', 1);
    setupSupabaseMock(mockAdminRow({ password_hash: hash }));

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'correctpassword123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  test('invalid type for username → 400 with issues', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 123, password: 'somepassword' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'username')).toBe(true);
  });

  test('invalid type for password (number) → 400', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 123 });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('invalid type for password (boolean) → 400', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: true });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('invalid type for password (null) → 400', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: null });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('empty string username → 400', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: '', password: 'somepassword' });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'username')).toBe(true);
  });

  test('empty string password → 400', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('login does not enforce password complexity (legacy passwords allowed)', async () => {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('short', 1);
    setupSupabaseMock(mockAdminRow({ password_hash: hash }));

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'short' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('username is case-sensitive (no lowercase normalization)', async () => {
    setupSupabaseMock(null);

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'TESTADMIN', password: 'correctpassword123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// Tests: requireAdmin middleware — protected route behaviour
// ---------------------------------------------------------------------------

describe('requireAdmin middleware', () => {
  const { generateToken } = require('../jwt');

  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/protected-test');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('user-role token → 403', async () => {
    const token = generateToken({ role: 'user', user_id: 99 }, { expiresIn: '1m' });
    const res = await request(app)
      .get('/api/admin/protected-test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  test('valid admin token → 200 with adminId', async () => {
    const token = generateToken({ role: 'admin', admin_id: 1 }, { expiresIn: '10m' });
    const res = await request(app)
      .get('/api/admin/protected-test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.adminId).toBe(1);
  });

  test('expired token → 401', async () => {
    const jsonwebtoken = require('jsonwebtoken');
    const expired = jsonwebtoken.sign(
      { role: 'admin', admin_id: 1, exp: Math.floor(Date.now() / 1000) - 60 },
      'test-secret'
    );
    const res = await request(app)
      .get('/api/admin/protected-test')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});
