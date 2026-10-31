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

// Mock SMS
let capturedOTP = null;
jest.mock('../utils/msg/sendSMSOTP', () =>
  jest.fn((otp) => { capturedOTP = otp; return true; })
);

// Mock audit log
jest.mock('../middleware/clinicAuditLog', () => ({
  clinicAuditLog: (req, res, next) => next(),
}));

// Mock PII
jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

// Mock hashForSearch
jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));

// Mock insertUser
const mockInsertUser = jest.fn();
jest.mock('../queries/create/createUser', () => mockInsertUser);

// Mock validator — pass through (skip PII encryption in tests)
jest.mock('../validators/validator', () =>
  jest.fn((schema, data) => ({ success: true, data, errors: [] }))
);

// Mock generatePassword
jest.mock('../utils/generatePassword', () => ({
  generatePassword: jest.fn(() => 'TestPass123!@#'),
}));

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

const samplePatient = {
  first_name: 'Sunita',
  last_name: 'Devi',
  phone: '+919811223344',
  email: 'sunita@example.com',
  dob: '1990-01-15',
  gender: 'female',
  street_address: '10 MG Road',
  city: 'Kolkata',
  state: 'West Bengal',
  country: 'India',
  location_x: 88.36,
  location_y: 22.57,
};

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '2kb' }));
  const clinicRoutes = require('../routes/clinicRoutes');
  app.use('/api/clinic', clinicRoutes);
});

afterEach(() => {
  jest.clearAllMocks();
  capturedOTP = null;
});

/**
 * Helper: create an authenticated booking session
 */
async function createAuthenticatedBooking() {
  // Mock getClinicById for send-otp
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
    // For user lookup in register — no existing users by default
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });

  const sendRes = await request(app)
    .post('/api/clinic/booking/send-otp')
    .set('Authorization', `Bearer ${clinicAdminToken()}`)
    .send({ phone: '+919811223344' });

  const bookingId = sendRes.body.bookingId;

  await request(app)
    .post('/api/clinic/booking/verify-otp')
    .set('Authorization', `Bearer ${clinicAdminToken()}`)
    .send({ bookingId, otp: capturedOTP });

  return bookingId;
}

describe('POST /api/clinic/booking/register-patient', () => {
  test('registers new patient after OTP auth', async () => {
    const bookingId = await createAuthenticatedBooking();

    mockInsertUser.mockResolvedValue({
      success: true,
      user: { user_id: 42, first_name: 'enc_Sunita', last_name: 'enc_Devi' },
    });

    const res = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, patient: samplePatient });

    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe(42);
    expect(res.body.first_name).toBe('Sunita');
  });

  test('rejects without OTP auth → 403', async () => {
    // Send OTP but don't verify
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

    const sendRes = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ phone: '+919811223344' });

    const res = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId: sendRes.body.bookingId, patient: samplePatient });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/OTP/i);
  });

  test('rejects when user already identified → 400', async () => {
    const bookingId = await createAuthenticatedBooking();

    // First registration succeeds
    mockInsertUser.mockResolvedValue({
      success: true,
      user: { user_id: 42, first_name: 'enc_Sunita', last_name: 'enc_Devi' },
    });

    await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, patient: samplePatient });

    // Second attempt should fail
    const res = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId, patient: samplePatient });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already/i);
  });

  test('invalid bookingId → 404', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId: 'bk_nonexistent', patient: samplePatient });

    expect(res.status).toBe(404);
  });

  test('missing fields → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
