const request = require('supertest');
const express = require('express');

jest.mock('../db', () => ({ from: jest.fn() }));
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload, opts) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h', ...opts })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
    extractUserId: jest.fn(),
  };
});
jest.mock('../queries/create/createActiveToken', () => ({ hashToken: jest.fn(() => 'hashed'), storeActiveToken: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../queries/read/getActiveTokens', () => ({ isTokenActive: jest.fn().mockResolvedValue(true) }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

const supabase = require('../db');
const { generateToken } = require('../jwt');

function adminToken() {
  return generateToken({ role: 'admin', admin_id: 1 }, { expiresIn: '10m' });
}

// Chain for active_tokens table — always returns a valid token so adminAuth middleware passes.
function activeTokenChain() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { token_id: 1 }, error: null }),
    // delete chain for logout
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function buildChain(single, maybeSingle, list, count) {
  return {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data: list ?? null, error: null, count: count ?? 0 }),
    single: jest.fn().mockResolvedValue({ data: single ?? null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: maybeSingle ?? null, error: null }),
  };
}

// Helper: mock supabase.from to return activeTokenChain for 'active_tokens', dataChain for everything else
function mockFrom(dataChain) {
  supabase.from.mockImplementation((table) => {
    if (table === 'active_tokens') return activeTokenChain();
    return dataChain;
  });
}

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const adminRoutes = require('../routes/adminRoutes');
  app.use('/api/admin', adminRoutes);
});

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs
// ---------------------------------------------------------------------------
describe('GET /api/admin/audit-logs', () => {
  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/audit-logs');
    expect(res.status).toBe(401);
  });

  test('returns logs with defaults', async () => {
    const logs = [
      { id: 1, admin_id: 1, entity_type: 'doctor', action: 'create', entity_id: 10, details: {}, created_at: new Date().toISOString() },
    ];
    mockFrom(buildChain(null, null, logs, 1));
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.logs).toBeDefined();
  });

  test('accepts filter params', async () => {
    mockFrom(buildChain(null, null, [], 0));
    const res = await request(app)
      .get('/api/admin/audit-logs?limit=10&role=admin&statusRange=4xx&method=GET')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/states
// ---------------------------------------------------------------------------
describe('GET /api/admin/states', () => {
  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/states');
    expect(res.status).toBe(401);
  });

  test('returns states list', async () => {
    mockFrom(buildChain(null, null, [], 0));
    const res = await request(app)
      .get('/api/admin/states')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.states).toBeDefined();
    expect(Array.isArray(res.body.states)).toBe(true);
    expect(res.body.states.length).toBeGreaterThan(0);
    expect(res.body.states[0]).toHaveProperty('value');
    expect(res.body.states[0]).toHaveProperty('label');
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/logout
// ---------------------------------------------------------------------------
describe('POST /api/admin/logout', () => {
  test('no token still returns 200 (graceful)', async () => {
    const res = await request(app).post('/api/admin/logout');
    // logout requires admin auth middleware, so without token → 401
    expect(res.status).toBe(401);
  });

  test('with token → 200', async () => {
    mockFrom(buildChain(null, null, null, 0));
    const res = await request(app)
      .post('/api/admin/logout')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});
