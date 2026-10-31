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

// Chain for active_tokens table — always returns a valid token so adminAuth passes.
function activeTokenChain() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { token_id: 1 }, error: null }),
  };
}

// Chain for a username check table — configurable result
function usernameChain(data) {
  return {
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: data ?? null, error: null }),
  };
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
// GET /api/admin/check-username
// ---------------------------------------------------------------------------
describe('GET /api/admin/check-username', () => {
  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/check-username/doctors?username=testuser');
    // No auth token — should be blocked by requireAdmin
    expect(res.status).toBe(401);
  });

  test('missing username → 400', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/doctors')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('username too short → 400', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/doctors?username=ab')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('available username → { available: true }', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      // All tables return null (username not found)
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/doctors?username=newuser')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  test('taken by doctor → { available: false }', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      if (table === 'doctors') return usernameChain({ username: 'takenuser' });
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/doctors?username=takenuser')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  test('taken by clinic → { available: false }', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      if (table === 'clinics') return usernameChain({ username: 'clinicuser' });
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/clinics?username=clinicuser')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  test('taken by clinic_manager → { available: false }', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      if (table === 'clinic_admins') return usernameChain({ username: 'mgruser' });
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/clinic-managers?username=mgruser&clinic_id=1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(false);
  });

  test('table not found error (42P01) is skipped gracefully', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'active_tokens') return activeTokenChain();
      // Simulate table-not-found for doctors
      if (table === 'doctors') {
        return {
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { code: '42P01' } }),
        };
      }
      return usernameChain(null);
    });
    const res = await request(app)
      .get('/api/admin/check-username/doctors?username=newuser')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });
});
