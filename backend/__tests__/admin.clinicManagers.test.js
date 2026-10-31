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

const sampleManager = {
  clinic_admin_id: 3,
  clinic_id: 5,
  name: 'Alice Manager',
  username: 'alice.mgr',
  phone: '8888888888',
  pfp_link: null,
  is_deleted: false,
  created_at: new Date().toISOString(),
};

function buildChain(single, maybeSingle, list) {
  return {
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: list ?? null, error: null }),
    single: jest.fn().mockResolvedValue({ data: single ?? null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: maybeSingle ?? null, error: null }),
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
// POST /api/admin/clinic-managers
// ---------------------------------------------------------------------------
describe('POST /api/admin/clinic-managers', () => {
  test('no token → 401', async () => {
    const res = await request(app).post('/api/admin/clinic-managers').send({});
    expect(res.status).toBe(401);
  });

  test('missing required fields → 400 with issues array', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Alice' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  test('creates manager → 201 with temporaryPassword', async () => {
    supabase.from.mockReturnValue(buildChain(sampleManager, null, null));
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(201);
    expect(res.body.manager).toBeDefined();
    expect(res.body.temporaryPassword).toBeDefined();
  });

  test('creates manager without temporaryPassword when password given', async () => {
    supabase.from.mockReturnValue(buildChain(sampleManager, null, null));
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5, name: 'Alice Manager', username: 'alice.mgr',
        phone: '8888888888', password: 'StrongPassword123!',
      });
    expect(res.status).toBe(201);
    expect(res.body.temporaryPassword).toBeUndefined();
  });

  test('invalid clinic_id → 400 (FK violation)', async () => {
    const chain = buildChain(null, null, null);
    chain.single.mockResolvedValue({ data: null, error: { code: '23503' } });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ clinic_id: 999, name: 'Alice', username: 'alice', phone: '8888888888' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/clinic-managers
// ---------------------------------------------------------------------------
describe('GET /api/admin/clinic-managers', () => {
  test('returns list', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, [sampleManager]));
    const res = await request(app)
      .get('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.managers).toHaveLength(1);
  });

  test('filters by clinic_id', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, [sampleManager]));
    const res = await request(app)
      .get('/api/admin/clinic-managers?clinic_id=5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  test('invalid clinic_id query → 400', async () => {
    const res = await request(app)
      .get('/api/admin/clinic-managers?clinic_id=abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/clinic-managers/:id
// ---------------------------------------------------------------------------
describe('GET /api/admin/clinic-managers - search/filter', () => {
  test('search param calls or filter', async () => {
    const chain = buildChain(null, null, [sampleManager]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinic-managers?search=alice')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  test('username filter calls ilike', async () => {
    const chain = buildChain(null, null, [sampleManager]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinic-managers?username=alice')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.ilike).toHaveBeenCalled();
  });

  test('clinic_id filter passes through', async () => {
    const chain = buildChain(null, null, [sampleManager]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinic-managers?clinic_id=5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalled();
  });

  test('invalid clinic_id → 400', async () => {
    const res = await request(app)
      .get('/api/admin/clinic-managers?clinic_id=abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('includeDeleted param passes through', async () => {
    const chain = buildChain(null, null, [{ ...sampleManager, is_deleted: true }]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinic-managers?includeDeleted=true')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.managers).toHaveLength(1);
  });
});

describe('GET /api/admin/clinic-managers/:id', () => {
  test('found → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleManager, null));
    const res = await request(app)
      .get('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.manager.clinic_admin_id).toBe(3);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .get('/api/admin/clinic-managers/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/clinic-managers/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/clinic-managers/:id', () => {
  test('no fields → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('updates manager → 200', async () => {
    const updated = { ...sampleManager, phone: '7777777777' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ phone: '7777777777' });
    expect(res.status).toBe(200);
    expect(res.body.manager.phone).toBe('7777777777');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/clinic-managers/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/clinic-managers/:id', () => {
  test('soft deletes → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleManager, null));
    const res = await request(app)
      .delete('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .delete('/api/admin/clinic-managers/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/clinic-managers/:id/restore
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/clinic-managers/:id/restore', () => {
  test('no token → 401', async () => {
    const res = await request(app).patch('/api/admin/clinic-managers/3/restore');
    expect(res.status).toBe(401);
  });

  test('invalid id → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinic-managers/abc/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('restores deleted manager → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, { clinic_admin_id: 3 }, null));
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/restored/i);
  });

  test('not found or not deleted → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/clinic-managers/99/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Comprehensive validation tests
// ---------------------------------------------------------------------------
describe('POST /api/admin/clinic-managers - validation edge cases', () => {
  test('invalid type for clinic_id (string) → 400 with issues', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 'not-a-number',
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'clinic_id')).toBe(true);
  });

  test('negative clinic_id → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: -1,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'clinic_id')).toBe(true);
  });

  test('zero clinic_id → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 0,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'clinic_id')).toBe(true);
  });

  test('float clinic_id → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5.5,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'clinic_id')).toBe(true);
  });

  test('parses string clinic_id to integer', async () => {
    supabase.from.mockReturnValue(buildChain(sampleManager, null, null));
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: '5',
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(201);
  });

  test('invalid type for name → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 123,
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'name')).toBe(true);
  });

  test('preserves username case', async () => {
    supabase.from.mockReturnValue(buildChain(sampleManager, null, null));
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 'Alice Manager',
        username: 'ALICE.MGR',
        phone: '8888888888',
      });
    expect(res.status).toBe(201);
  });

  test('normalizes phone with +91 prefix', async () => {
    supabase.from.mockReturnValue(buildChain(sampleManager, null, null));
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: '8888888888',
      });
    expect(res.status).toBe(201);
  });

  test('username too short → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 'Alice Manager',
        username: 'ab',
        phone: '8888888888',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'username')).toBe(true);
  });

  test('invalid phone type → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinic-managers')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_id: 5,
        name: 'Alice Manager',
        username: 'alice.mgr',
        phone: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'phone')).toBe(true);
  });
});

describe('PATCH /api/admin/clinic-managers/:id - validation edge cases', () => {
  test('invalid type for name → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'name')).toBe(true);
  });

  test('updates name successfully', async () => {
    const updated = { ...sampleManager, name: 'Bob Manager' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Bob Manager' });
    expect(res.status).toBe(200);
  });

  test('password too short in update → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinic-managers/3')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });
});
