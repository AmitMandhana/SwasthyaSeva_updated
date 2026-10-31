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

const sampleClinic = {
  clinic_id: 5,
  username: 'testclinic',
  clinic_name: 'Test Clinic',
  phone: '9000000000',
  license_no: 'CLN001',
  pfp_link: 'https://example.com/pfp.jpg',
  verified: false,
  banner_link: 'https://example.com/banner.jpg',
  street_address: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'India',
  location_x: 72.8777,
  location_y: 19.0760,
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
// POST /api/admin/clinics
// ---------------------------------------------------------------------------
describe('POST /api/admin/clinics', () => {
  test('no token → 401', async () => {
    const res = await request(app).post('/api/admin/clinics').send({});
    expect(res.status).toBe(401);
  });

  test('missing required fields → 400 with issues array', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ clinic_name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  test('creates clinic → 201 with temporaryPassword', async () => {
    supabase.from.mockReturnValue(buildChain(sampleClinic, null, null));
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'testclinic',
        phone: '9000000000',
        license_no: 'CLN001',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        location_x: 72.8777,
        location_y: 19.0760,
      });
    expect(res.status).toBe(201);
    expect(res.body.clinic).toBeDefined();
    expect(res.body.temporaryPassword).toBeDefined();
  });

  test('short password → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'testclinic', phone: '9000000000', license_no: 'CLN001',
        pfp_link: 'x', banner_link: 'x',
        street_address: 'x', city: 'x', state: 'x',
        location_x: 1, location_y: 1, password: 'short',
      });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/clinics
// ---------------------------------------------------------------------------
describe('GET /api/admin/clinics', () => {
  test('returns list', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, [sampleClinic]));
    const res = await request(app)
      .get('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.clinics).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/clinics/:id
// ---------------------------------------------------------------------------
describe('GET /api/admin/clinics - search/filter', () => {
  test('search param calls or filter', async () => {
    const chain = buildChain(null, null, [sampleClinic]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinics?search=test')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  test('city filter calls ilike', async () => {
    const chain = buildChain(null, null, [sampleClinic]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinics?city=Mumbai')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.ilike).toHaveBeenCalled();
  });

  test('state filter calls ilike', async () => {
    const chain = buildChain(null, null, [sampleClinic]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinics?state=mh')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.ilike).toHaveBeenCalled();
  });

  test('includeDeleted param passes through', async () => {
    const chain = buildChain(null, null, [{ ...sampleClinic, is_deleted: true }]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/clinics?includeDeleted=true')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.clinics).toHaveLength(1);
  });
});

describe('GET /api/admin/clinics/:id', () => {
  test('invalid id → 400', async () => {
    const res = await request(app)
      .get('/api/admin/clinics/abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .get('/api/admin/clinics/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  test('found → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleClinic, null));
    const res = await request(app)
      .get('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.clinic.clinic_id).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/clinics/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/clinics/:id', () => {
  test('no fields → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('updates clinic → 200', async () => {
    const updated = { ...sampleClinic, city: 'Pune' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ city: 'Pune' });
    expect(res.status).toBe(200);
    expect(res.body.clinic.city).toBe('Pune');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/clinics/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/clinics/:id', () => {
  test('soft deletes → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleClinic, null));
    const res = await request(app)
      .delete('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .delete('/api/admin/clinics/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/clinics/:id/restore
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/clinics/:id/restore', () => {
  test('no token → 401', async () => {
    const res = await request(app).patch('/api/admin/clinics/5/restore');
    expect(res.status).toBe(401);
  });

  test('invalid id → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinics/abc/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('restores deleted clinic → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, { clinic_id: 5 }, null));
    const res = await request(app)
      .patch('/api/admin/clinics/5/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/restored/i);
  });

  test('not found or not deleted → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/clinics/99/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Comprehensive validation tests
// ---------------------------------------------------------------------------
describe('POST /api/admin/clinics - validation edge cases', () => {
  test('invalid type for location_x → 400 with issues', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        location_x: 'not-a-number',
        location_y: 19.0760,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'location_x')).toBe(true);
  });

  test('location_x out of range → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        location_x: 200,
        location_y: 19.0760,
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'location_x')).toBe(true);
  });

  test('location_y out of range → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        location_x: 72.8777,
        location_y: -100,
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'location_y')).toBe(true);
  });

  test('normalizes state name to code', async () => {
    supabase.from.mockReturnValue(buildChain(sampleClinic, null, null));
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'testclinic',
        phone: '9000000000',
        license_no: 'CLN001',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        location_x: 72.8777,
        location_y: 19.0760,
      });
    expect(res.status).toBe(201);
  });

  test('normalizes city to title case', async () => {
    supabase.from.mockReturnValue(buildChain(sampleClinic, null, null));
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'testclinic',
        phone: '9000000000',
        license_no: 'CLN001',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'mumbai',
        state: 'mh',
        pincode: '400001',
        location_x: 72.8777,
        location_y: 19.0760,
      });
    expect(res.status).toBe(201);
  });

  test('clinic_name exceeds 20 chars → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        clinic_name: 'A'.repeat(21),
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        location_x: 72.8777,
        location_y: 19.0760,
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'clinic_name')).toBe(true);
  });

  test('street_address exceeds 40 chars → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: 'A'.repeat(41),
        city: 'Mumbai',
        state: 'mh',
        location_x: 72.8777,
        location_y: 19.0760,
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'street_address')).toBe(true);
  });

  test('invalid type for verified → 400', async () => {
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        phone: '9000000000',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        location_x: 72.8777,
        location_y: 19.0760,
        verified: 'yes',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'verified')).toBe(true);
  });

  test('normalizes country alias', async () => {
    supabase.from.mockReturnValue(buildChain(sampleClinic, null, null));
    const res = await request(app)
      .post('/api/admin/clinics')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'testclinic',
        phone: '9000000000',
        license_no: 'CLN001',
        pfp_link: 'https://example.com/pfp.jpg',
        banner_link: 'https://example.com/banner.jpg',
        street_address: '123 Main St',
        city: 'Mumbai',
        state: 'mh',
        pincode: '400001',
        location_x: 72.8777,
        location_y: 19.0760,
        country: 'Bharat',
      });
    expect(res.status).toBe(201);
  });

});

describe('PATCH /api/admin/clinics/:id - validation edge cases', () => {
  test('clinic_name exceeds 20 chars → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ clinic_name: 'A'.repeat(21) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'clinic_name')).toBe(true);
  });

  test('normalizes state in update', async () => {
    const updated = { ...sampleClinic, state: 'mh' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/clinics/5')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ state: 'Maharashtra' });
    expect(res.status).toBe(200);
  });
});
