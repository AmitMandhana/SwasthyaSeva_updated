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

// Mock username-resolution queries
jest.mock('../queries/read/getDoctorByUsername', () => ({
  getDoctorByUsername: jest.fn(),
}));
jest.mock('../queries/read/getClinicByUsername', () => ({
  getClinicByUsername: jest.fn(),
}));

const supabase = require('../db');
const { generateToken } = require('../jwt');
const { getDoctorByUsername } = require('../queries/read/getDoctorByUsername');
const { getClinicByUsername } = require('../queries/read/getClinicByUsername');

function adminToken() {
  return generateToken({ role: 'admin', admin_id: 1 }, { expiresIn: '10m' });
}

const sampleSlot = {
  slot_id: 1,
  clinic_id: 5,
  doctor_id: 2,
  slot_fee: 500,
  slot_day: 'MON',
  slot_start: 18,
  slot_end: 24,
  is_deleted: false,
  created_at: new Date().toISOString(),
};

const sampleSlotWithNames = {
  ...sampleSlot,
  doctor: { username: 'dr.smith', first_name: 'John', last_name: 'Smith', tag_1: null, tag_2: null, tag_3: null },
  clinic: { username: 'cityclinic', clinic_name: 'Test Clinic', city: 'Mumbai' },
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
// Auth guard
// ---------------------------------------------------------------------------
describe('Slot routes — auth guard', () => {
  test('GET /api/admin/slots without token → 401', async () => {
    const res = await request(app).get('/api/admin/slots');
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/slots with user-role token → 403', async () => {
    const userToken = generateToken({ role: 'user', user_id: 1 }, { expiresIn: '10m' });
    const res = await request(app)
      .get('/api/admin/slots')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/slots  (username-based create)
// ---------------------------------------------------------------------------
describe('POST /api/admin/slots', () => {
  test('missing required fields → 400 with issues array', async () => {
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  test('unknown doctor_username → 404', async () => {
    getDoctorByUsername.mockResolvedValue(null);
    getClinicByUsername.mockResolvedValue({ clinic_id: 5, clinic_name: 'Test Clinic' });
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'nobody', clinic_username: 'cityclinic', slot_fee: 500, slot_day: 'MON', slot_start: 18, slot_end: 24 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/doctor/i);
  });

  test('unknown clinic_username → 404', async () => {
    getDoctorByUsername.mockResolvedValue({ doctor_id: 2, first_name: 'John', last_name: 'Smith' });
    getClinicByUsername.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'dr.smith', clinic_username: 'nowhere', slot_fee: 500, slot_day: 'MON', slot_start: 18, slot_end: 24 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/clinic/i);
  });

  test('creates slot → 201', async () => {
    getDoctorByUsername.mockResolvedValue({ doctor_id: 2, first_name: 'John', last_name: 'Smith' });
    getClinicByUsername.mockResolvedValue({ clinic_id: 5, clinic_name: 'Test Clinic' });
    supabase.from.mockReturnValue(buildChain(sampleSlot, null, null));
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'dr.smith', clinic_username: 'cityclinic', slot_fee: 500, slot_day: 'MON', slot_start: 18, slot_end: 24 });
    expect(res.status).toBe(201);
    expect(res.body.slot).toBeDefined();
    expect(res.body.slot.slot_id).toBe(1);
  });

  test('normalizes string inputs and day to uppercase', async () => {
    getDoctorByUsername.mockResolvedValue({ doctor_id: 2, first_name: 'John', last_name: 'Smith' });
    getClinicByUsername.mockResolvedValue({ clinic_id: 5, clinic_name: 'Test Clinic' });
    supabase.from.mockReturnValue(buildChain(sampleSlot, null, null));
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'dr.smith', clinic_username: 'cityclinic', slot_fee: '500', slot_day: 'mon', slot_start: '18', slot_end: '24' });
    expect(res.status).toBe(201);
  });

  test('invalid slot_day → 400', async () => {
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'dr.smith', clinic_username: 'cityclinic', slot_fee: 500, slot_day: 'HOLIDAY', slot_start: 18, slot_end: 24 });
    expect(res.status).toBe(400);
    expect(res.body.issues.some((e) => e.field === 'slot_day')).toBe(true);
  });

  test('zero slot_fee → 400', async () => {
    const res = await request(app)
      .post('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ doctor_username: 'dr.smith', clinic_username: 'cityclinic', slot_fee: 0, slot_day: 'MON', slot_start: 18, slot_end: 24 });
    expect(res.status).toBe(400);
    expect(res.body.issues.some((e) => e.field === 'slot_fee')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/slots
// ---------------------------------------------------------------------------
describe('GET /api/admin/slots', () => {
  test('returns list with doctor_username and clinic_username', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, [sampleSlotWithNames]));
    const res = await request(app)
      .get('/api/admin/slots')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.slots[0].doctor_username).toBe('dr.smith');
    expect(res.body.slots[0].clinic_username).toBe('cityclinic');
  });

  test('doctor_username filter passes to query', async () => {
    const chain = buildChain(null, null, [sampleSlotWithNames]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/slots?doctor_username=dr.smith')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.ilike).toHaveBeenCalled();
  });

  test('includeDeleted=true passes through', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, []));
    const res = await request(app)
      .get('/api/admin/slots?includeDeleted=true')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/slots/:slot_id
// ---------------------------------------------------------------------------
describe('GET /api/admin/slots/:slot_id', () => {
  test('invalid id → 400', async () => {
    const res = await request(app)
      .get('/api/admin/slots/abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .get('/api/admin/slots/999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  test('found → 200 with username fields', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleSlotWithNames, null));
    const res = await request(app)
      .get('/api/admin/slots/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.slot.slot_id).toBe(1);
    expect(res.body.slot.doctor_username).toBe('dr.smith');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/slots/:slot_id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/slots/:slot_id', () => {
  test('no fields → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/slots/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('updates slot → 200', async () => {
    const updated = { ...sampleSlot, slot_fee: 300 };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/slots/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ slot_fee: 300 });
    expect(res.status).toBe(200);
    expect(res.body.slot.slot_fee).toBe(300);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/slots/999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ slot_fee: 300 });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/slots/:slot_id  (soft delete)
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/slots/:slot_id', () => {
  test('soft deletes → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, { slot_id: 1 }, null));
    const res = await request(app)
      .delete('/api/admin/slots/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  test('not found or already deleted → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .delete('/api/admin/slots/999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  test('invalid id → 400', async () => {
    const res = await request(app)
      .delete('/api/admin/slots/abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/slots/:slot_id/restore
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/slots/:slot_id/restore', () => {
  test('restores slot → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, { slot_id: 1 }, null));
    const res = await request(app)
      .patch('/api/admin/slots/1/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/restored/i);
  });

  test('not found or not deleted → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/slots/999/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  test('invalid id → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/slots/abc/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });
});
