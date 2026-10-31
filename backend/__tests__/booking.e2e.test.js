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

jest.mock('../middleware/clinicAuditLog', () => ({
  clinicAuditLog: (req, res, next) => next(),
}));

jest.mock('../utils/pii', () => ({
  encrypt: jest.fn(v => `enc_${v}`),
  decrypt: jest.fn(v => v.startsWith('enc_') ? v.slice(4) : v),
}));

jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));

// Mock insertUser
const mockInsertUser = jest.fn();
jest.mock('../queries/create/createUser', () => mockInsertUser);

jest.mock('../validators/validator', () =>
  jest.fn((schema, data) => ({ success: true, data, errors: [] }))
);

jest.mock('../utils/generatePassword', () => ({
  generatePassword: jest.fn(() => 'TestPass123!@#'),
}));

// Mock pg Pool for createAppointment
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockPool = {
  connect: jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease }),
  query: mockQuery, end: jest.fn(), on: jest.fn(),
};
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));
jest.mock('../utils/pool', () => ({ getPool: jest.fn(() => mockPool) }));

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

/** Return the YYYY-MM-DD of the next occurrence of the given 3-letter day (MON, TUE, ...). */
function nextWeekday(dayAbbr) {
  const map = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  const target = map[dayAbbr];
  const d = new Date();
  const diff = ((target - d.getUTCDay()) + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

const nextMonday = nextWeekday('MON');

jest.mock('../queries/read/getSlots', () => ({
  getSlots: jest.fn(),
  getSlotById: jest.fn(),
}));

const { getSlotById } = require('../queries/read/getSlots');

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

function clinicEntityToken() {
  const jsonwebtoken = require('jsonwebtoken');
  return jsonwebtoken.sign({ role: 'clinic', clinic_id: 8, name: 'CityHealth' }, mockJwtSecret, { expiresIn: '1h' });
}

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

// ── Full E2E Flow: New Patient ──

describe('E2E: New patient booking flow', () => {
  test('lookup → OTP → register → book appointment', async () => {
    const token = clinicAdminToken();

    // 1. Lookup — patient not found
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const lookupRes = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+919999888877' });
    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.found).toBe(false);

    // 2. Send OTP
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

    const otpRes = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+919999888877' });
    expect(otpRes.status).toBe(200);
    expect(otpRes.body.bookingId).toBeTruthy();
    const bookingId = otpRes.body.bookingId;

    // 3. Verify OTP
    const verifyRes = await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId, otp: capturedOTP });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.authenticated).toBe(true);
    expect(verifyRes.body.userId).toBeNull();

    // 4. Register patient
    mockInsertUser.mockResolvedValue({
      success: true,
      user: { user_id: 100, first_name: 'enc_New', last_name: 'enc_Patient' },
    });

    const regRes = await request(app)
      .post('/api/clinic/booking/register-patient')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId,
        patient: {
          first_name: 'New', last_name: 'Patient', phone: '+919999888877',
          email: 'new@test.com', dob: '1995-01-01', gender: 'male',
          street_address: '10 Test St', city: 'Kolkata', state: 'West Bengal',
          country: 'India', location_x: 88.36, location_y: 22.57,
        },
      });
    expect(regRes.status).toBe(201);
    expect(regRes.body.user_id).toBe(100);

    // 5. Create appointment
    getSlotById.mockResolvedValue({
      slot_id: 5, clinic_id: 8, doctor_id: 9, slot_fee: 500, booking_fee: 50,
      slot_day: 'MON', slot_start: 18, slot_end: 24,
    });

    mockQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE (lock)
      .mockResolvedValueOnce({ rows: [{ next_index: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{
        appointment_id: 200, user_id: 100, doctor_id: 9, slot_id: 5,
        recommended_index: 1, symptom_code: 'FEVER', symptom_text: 'High fever',
        complaints: 'General checkup', appointment_date: nextMonday,
        appointment_status: 'accepted', booking_fee_paid: 50, visit_no: 1,
        last_visit_id: null, booked_at: new Date().toISOString(),
      }] })
      .mockResolvedValueOnce(undefined); // COMMIT

    const bookRes = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId, slot_id: 5, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'High fever',
        complaints: 'General checkup', booking_fee_paid: 50,
        appointment_status: 'accepted',
      });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.appointment.appointment_id).toBe(200);
    expect(bookRes.body.appointment.visit_no).toBe(1);
    expect(bookRes.body.appointment.booking_fee_paid).toBe(50);

    // 6. Booking consumed — cannot reuse
    const reuseRes = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId, slot_id: 5, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'Follow up',
      });
    expect(reuseRes.status).toBe(404);
  });
});

// ── Clinic entity can also book ──

describe('E2E: Clinic entity booking', () => {
  test('clinic entity role can use all booking endpoints', async () => {
    const token = clinicEntityToken();

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const lookupRes = await request(app)
      .post('/api/clinic/booking/lookup')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+919111222333' });
    expect(lookupRes.status).toBe(200);
  });
});

// ── Edge cases ──

describe('E2E: Edge cases', () => {
  test('unauthenticated request → 401', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/lookup')
      .send({ phone: '+919876543210' });
    expect(res.status).toBe(401);
  });

  test('wrong clinic slot → 403', async () => {
    const token = clinicAdminToken();

    // Set up authenticated booking quickly
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
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn((col) => {
              if (col === 'user_id') {
                return { maybeSingle: jest.fn().mockResolvedValue({ data: { user_id: 1, phone_hash: 'hash_+919876543210' }, error: null }) };
              }
              return jest.fn().mockResolvedValue({ data: [], error: null });
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    });

    const otpRes = await request(app)
      .post('/api/clinic/booking/send-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+919876543210', user_id: 1 });
    const bookingId = otpRes.body.bookingId;

    await request(app)
      .post('/api/clinic/booking/verify-otp')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId, otp: capturedOTP });

    // Slot belongs to clinic 999, not 8
    getSlotById.mockResolvedValue({
      slot_id: 99, clinic_id: 999, doctor_id: 5, slot_fee: 300,
      slot_day: 'MON', slot_start: 12, slot_end: 18,
    });

    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bookingId, slot_id: 99, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'Fever',
      });
    expect(res.status).toBe(403);
  });
});
