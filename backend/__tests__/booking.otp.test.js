const request = require('supertest');
const express = require('express');
// Mock Supabase
const mockFrom = jest.fn();
jest.mock('../db', () => ({ from: mockFrom }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

// Mock rate limiters
jest.mock('../ratelimits/booking', () => ({
  bookingLookupLimit: (req, res, next) => next(),
  bookingOTPSendLimit: (req, res, next) => next(),
  bookingOTPVerifyLimit: (req, res, next) => next(),
}));

// Mock SMS — capture OTP
let capturedOTP = null;
jest.mock('../utils/msg/sendSMSOTP', () =>
  jest.fn((otp) => { capturedOTP = otp; return true; })
);

// Mock clinic audit log middleware
jest.mock('../middleware/clinicAuditLog', () => ({
  clinicAuditLog: (req, res, next) => next(),
}));

// Mock PII decrypt
jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

// Mock hashForSearch
jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));

const mockJwtSecret = 'test-secret';
jest.mock('../jwt', () => {
  const jsonwebtoken = require('jsonwebtoken');
  return {
    generateToken: jest.fn((payload) => jsonwebtoken.sign(payload, 'test-secret', { expiresIn: '1h' })),
    verifyToken: jest.fn((token) => { try { return jsonwebtoken.verify(token, 'test-secret'); } catch { return null; } }),
  };
});

function clinicAdminToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'clinic_admin', clinic_admin_id: 3, clinic_id: 8, username: 'cityadmin1', name: 'Test Admin' }, mockJwtSecret, { expiresIn: '1h' });
}

// Build app
let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const clinicRoutes = require('../routes/clinicRoutes');
  app.use('/api/clinic', clinicRoutes);
});

afterEach(() => {
  jest.clearAllMocks();
  capturedOTP = null;
});

// ─── Patient Lookup ───

describe('POST /api/clinic/booking/lookup', () => {
  test('missing phone → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/phone/i);
  });

  test('invalid phone → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('phone not found → { found: false }', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '+919876543210' });
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
    expect(res.body.users).toEqual([]);
  });

  test('phone found → returns decrypted users', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ user_id: 1, first_name: 'enc_John', last_name: 'enc_Doe', phone: 'enc_+919876543210' }],
          error: null,
        }),
      }),
    });
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '+919876543210' });
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.users[0].first_name).toBe('John');
    expect(res.body.users[0].last_name).toBe('Doe');
    expect(res.body.users[0].user_id).toBe(1);
  });

  test('no auth → 401', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .send({ phone: '+919876543210' });
    expect(res.status).toBe(401);
  });
});

// ─── Send OTP ───

describe('POST /api/clinic/booking/send-otp', () => {
  test('sends OTP and returns bookingId', async () => {
    // Mock getClinicById
    mockFrom.mockImplementation((table) => {
      if (table === 'clinics') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { clinic_id: 8, clinic_name: 'CityHealth' }, error: null }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const res = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '+919876543210' });
    expect(res.status).toBe(200);
    expect(res.body.bookingId).toMatch(/^bk_/);
    expect(capturedOTP).toBeTruthy();
    expect(capturedOTP).toHaveLength(6);
  });

  test('missing phone → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

// ─── Verify OTP ───

describe('POST /api/clinic/booking/verify-otp', () => {
  let bookingId;

  beforeEach(async () => {
    mockFrom.mockImplementation((table) => {
      if (table === 'clinics') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { clinic_id: 8, clinic_name: 'CityHealth' }, error: null }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const res = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '+919876543210' });
    bookingId = res.body.bookingId;
  });

  test('correct OTP → authenticated', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, otp: capturedOTP });
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
  });

  test('wrong OTP → 400 with attemptsRemaining', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, otp: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.attemptsRemaining).toBe(2);
  });

  test('3 wrong attempts → 403 and booking deleted', async () => {
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/clinic/booking/verify-otp')
        .set('Authorization', `Bearer ${clinicAdminToken()}`)
        .send({ bookingId, otp: '000000' });
    }
    const res = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, otp: '000000' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/maximum/i);

    // Booking should be deleted
    const res2 = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, otp: capturedOTP });
    expect(res2.status).toBe(404);
  });

  test('missing fields → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('invalid bookingId → 404', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId: 'bk_nonexistent', otp: '123456' });
    expect(res.status).toBe(404);
  });
});
