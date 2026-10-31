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
jest.mock('../queries/create/createActiveToken', () => ({
  hashToken: jest.fn(() => 'hashed'),
  storeActiveToken: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../queries/read/getActiveTokens', () => ({
  isTokenActive: jest.fn().mockResolvedValue(true),
}));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

const supabase = require('../db');
const { generateToken } = require('../jwt');

function adminToken() {
  return generateToken({ role: 'admin', admin_id: 1 }, { expiresIn: '10m' });
}

// Minimal doctor row (no password_hash)
const sampleDoctor = {
  doctor_id: 10,
  username: 'dr.smith',
  first_name: 'John',
  last_name: 'Smith',
  phone: '9999999999',
  pfp_link: null,
  base_degree_code: 'MBBS',
  postgrad_specialization_code: null,
  super_specialization_code: null,
  tag_1: null, tag_2: null, tag_3: null,
  bio: null,
  license_no: 'LIC001',
  verified_doctor: false,
  banner_link: null,
  signature_link: null,
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
// POST /api/admin/doctors
// ---------------------------------------------------------------------------
describe('POST /api/admin/doctors', () => {
  test('no token → 401', async () => {
    const res = await request(app).post('/api/admin/doctors').send({});
    expect(res.status).toBe(401);
  });

  test('missing required fields → 400 with issues array', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'dr.smith' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  test('creates doctor → 201 with temporaryPassword when no password given', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
      });
    expect(res.status).toBe(201);
    expect(res.body.doctor).toBeDefined();
    expect(res.body.temporaryPassword).toBeDefined();
    expect(typeof res.body.temporaryPassword).toBe('string');
  });

  test('creates doctor → 201 without temporaryPassword when password provided', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        password: 'StrongPassword123!',
      });
    expect(res.status).toBe(201);
    expect(res.body.temporaryPassword).toBeUndefined();
  });

  test('short password → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith', first_name: 'John', last_name: 'Smith',
        phone: '9999999999', base_degree_code: 'MBBS', license_no: 'LIC001',
        password: 'short',
      });
    expect(res.status).toBe(400);
  });

  test('duplicate username → 409', async () => {
    const chain = buildChain(null, null, null);
    chain.single.mockResolvedValue({ data: null, error: { code: '23505' } });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith', first_name: 'John', last_name: 'Smith',
        phone: '9999999999', base_degree_code: 'MBBS', license_no: 'LIC001',
      });
    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/doctors
// ---------------------------------------------------------------------------
describe('GET /api/admin/doctors', () => {
  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/doctors');
    expect(res.status).toBe(401);
  });

  test('returns list', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, [sampleDoctor]));
    const res = await request(app)
      .get('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.doctors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/doctors/:id
// ---------------------------------------------------------------------------
describe('GET /api/admin/doctors - search/filter', () => {
  test('search param calls or filter', async () => {
    const chain = buildChain(null, null, [sampleDoctor]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/doctors?search=smith')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  test('username filter calls ilike', async () => {
    const chain = buildChain(null, null, [sampleDoctor]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/doctors?username=dr')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.ilike).toHaveBeenCalled();
  });

  test('name filter calls or', async () => {
    const chain = buildChain(null, null, [sampleDoctor]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/doctors?name=John')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(chain.or).toHaveBeenCalled();
  });

  test('includeDeleted param passes through', async () => {
    const chain = buildChain(null, null, [{ ...sampleDoctor, is_deleted: true }]);
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .get('/api/admin/doctors?includeDeleted=true')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.doctors).toHaveLength(1);
  });
});

describe('GET /api/admin/doctors/:id', () => {
  test('invalid id → 400', async () => {
    const res = await request(app)
      .get('/api/admin/doctors/abc')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .get('/api/admin/doctors/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  test('found → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleDoctor, null));
    const res = await request(app)
      .get('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.doctor.doctor_id).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/doctors/:id
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/doctors/:id', () => {
  test('no fields → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('updates doctor → 200', async () => {
    const updated = { ...sampleDoctor, bio: 'Updated bio' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ bio: 'Updated bio' });
    expect(res.status).toBe(200);
    expect(res.body.doctor.bio).toBe('Updated bio');
  });

  test('not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/doctors/99')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ bio: 'x' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/doctors/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/doctors/:id', () => {
  test('soft deletes → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, sampleDoctor, null));
    const res = await request(app)
      .delete('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
  });

  test('already deleted / not found → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .delete('/api/admin/doctors/99')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Comprehensive validation tests
// ---------------------------------------------------------------------------
describe('POST /api/admin/doctors - validation edge cases', () => {
  test('invalid type for first_name → 400 with issues', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 123,
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues).toBeDefined();
    expect(res.body.issues.some(e => e.field === 'first_name')).toBe(true);
  });

  test('invalid type for phone → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: true,
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'phone')).toBe(true);
  });

  test('invalid type for verified_doctor → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        verified_doctor: 'notbool',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'verified_doctor')).toBe(true);
  });

  test('preserves username case', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'DR.SMITH',
        first_name: 'John',
        last_name: 'Doe',
        phone: '9876543210',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        password: 'SecurePass123!@#',
      });
    expect(res.status).toBe(201);
  });

  test('normalizes phone with +91 prefix', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
      });
    expect(res.status).toBe(201);
  });

  test('username too short → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'ab',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'username')).toBe(true);
  });

  test('bio at max length (500 chars) → 201', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        bio: 'a'.repeat(500),
      });
    expect(res.status).toBe(201);
  });

  test('bio exceeds max length → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        bio: 'a'.repeat(501),
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'bio')).toBe(true);
  });

  test('password missing complexity → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        password: 'alllowercase12',
      });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });

  test('extra fields are ignored', async () => {
    supabase.from.mockReturnValue(buildChain(sampleDoctor, null, null));
    const res = await request(app)
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        username: 'dr.smith',
        first_name: 'John',
        last_name: 'Smith',
        phone: '9999999999',
        base_degree_code: 'MBBS',
        license_no: 'LIC001',
        extra_field: 'should be ignored',
      });
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/doctors/:id/restore
// ---------------------------------------------------------------------------
describe('PATCH /api/admin/doctors/:id/restore', () => {
  test('no token → 401', async () => {
    const res = await request(app).patch('/api/admin/doctors/10/restore');
    expect(res.status).toBe(401);
  });

  test('invalid id → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/doctors/abc/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('restores deleted doctor → 200', async () => {
    supabase.from.mockReturnValue(buildChain(null, { doctor_id: 10 }, null));
    const res = await request(app)
      .patch('/api/admin/doctors/10/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/restored/i);
  });

  test('not found or not deleted → 404', async () => {
    supabase.from.mockReturnValue(buildChain(null, null, null));
    const res = await request(app)
      .patch('/api/admin/doctors/99/restore')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/doctors/:id/extra-qualifications
// ---------------------------------------------------------------------------
describe('POST /api/admin/doctors/:id/extra-qualifications', () => {
  test('no token → 401', async () => {
    const res = await request(app)
      .post('/api/admin/doctors/10/extra-qualifications')
      .send({ qualification_code: 'FELL_CARDIO' });
    expect(res.status).toBe(401);
  });

  test('invalid doctor_id → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors/abc/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ qualification_code: 'FELL_CARDIO' });
    expect(res.status).toBe(400);
  });

  test('missing qualification_code → 400', async () => {
    const res = await request(app)
      .post('/api/admin/doctors/10/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('adds qualification → 201', async () => {
    const qual = { doctor_id: 10, qualification_code: 'FELL_CARDIO', created_at: new Date().toISOString() };
    supabase.from.mockReturnValue(buildChain(qual, null, null));
    const res = await request(app)
      .post('/api/admin/doctors/10/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ qualification_code: 'FELL_CARDIO' });
    expect(res.status).toBe(201);
    expect(res.body.qualification).toBeDefined();
  });

  test('duplicate → 409', async () => {
    const chain = buildChain(null, null, null);
    chain.single.mockResolvedValue({ data: null, error: { code: '23505' } });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .post('/api/admin/doctors/10/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ qualification_code: 'FELL_CARDIO' });
    expect(res.status).toBe(409);
  });

  test('invalid FK → 400', async () => {
    const chain = buildChain(null, null, null);
    chain.single.mockResolvedValue({ data: null, error: { code: '23503' } });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .post('/api/admin/doctors/10/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ qualification_code: 'NONEXISTENT' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/doctors/:id/extra-qualifications
// ---------------------------------------------------------------------------
describe('GET /api/admin/doctors/:id/extra-qualifications', () => {
  test('no token → 401', async () => {
    const res = await request(app).get('/api/admin/doctors/10/extra-qualifications');
    expect(res.status).toBe(401);
  });

  test('invalid doctor_id → 400', async () => {
    const res = await request(app)
      .get('/api/admin/doctors/abc/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('returns list → 200', async () => {
    const quals = [
      { doctor_id: 10, qualification_code: 'FELL_CARDIO', created_at: new Date().toISOString() },
    ];
    supabase.from.mockReturnValue(buildChain(null, null, quals));
    const res = await request(app)
      .get('/api/admin/doctors/10/extra-qualifications')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.qualifications).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/doctors/:id/extra-qualifications/:code
// ---------------------------------------------------------------------------
describe('DELETE /api/admin/doctors/:id/extra-qualifications/:code', () => {
  test('no token → 401', async () => {
    const res = await request(app).delete('/api/admin/doctors/10/extra-qualifications/FELL_CARDIO');
    expect(res.status).toBe(401);
  });

  test('invalid doctor_id → 400', async () => {
    const res = await request(app)
      .delete('/api/admin/doctors/abc/extra-qualifications/FELL_CARDIO')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  test('removes qualification → 200', async () => {
    const chain = buildChain(null, null, [{ doctor_id: 10, qualification_code: 'FELL_CARDIO' }]);
    // .delete().eq().eq().select() resolves via the select→eq chain, ending in order/list
    // Override select to resolve directly with data array
    chain.select.mockResolvedValue({ data: [{ doctor_id: 10, qualification_code: 'FELL_CARDIO' }], error: null });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .delete('/api/admin/doctors/10/extra-qualifications/FELL_CARDIO')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  test('not found → 404', async () => {
    const chain = buildChain(null, null, null);
    chain.select.mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue(chain);
    const res = await request(app)
      .delete('/api/admin/doctors/10/extra-qualifications/NONEXISTENT')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/doctors/:id - validation edge cases', () => {
  test('invalid type for verified_doctor → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ verified_doctor: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.issues.some(e => e.field === 'verified_doctor')).toBe(true);
  });

  test('normalizes phone in update', async () => {
    const updated = { ...sampleDoctor, phone: '+918888888888' };
    supabase.from.mockReturnValue(buildChain(null, updated, null));
    const res = await request(app)
      .patch('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ phone: '8888888888' });
    expect(res.status).toBe(200);
  });

  test('password too short in update → 400', async () => {
    const res = await request(app)
      .patch('/api/admin/doctors/10')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.issues.some(e => e.field === 'password')).toBe(true);
  });
});
