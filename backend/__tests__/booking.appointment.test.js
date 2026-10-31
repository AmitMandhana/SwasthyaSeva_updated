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

jest.mock('../utils/hashForSearch', () => jest.fn(v => `hash_${v}`));

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
const nextTuesday = nextWeekday('TUE');

// Mock getSlotById
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
 * Helper: create an authenticated booking with a userId set
 */
async function createAuthenticatedBookingWithUser() {
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
          eq: jest.fn((col, val) => {
            if (col === 'user_id') {
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { user_id: 42, phone_hash: 'hash_+919876543210' },
                  error: null,
                }),
              };
            }
            return { mockResolvedValue: jest.fn().mockResolvedValue({ data: [], error: null }) };
          }),
        }),
      };
    }
    return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
  });

  // Send OTP for existing user
  const sendRes = await request(app)
    .post('/api/clinic/booking/send-otp')
    .set('Authorization', `Bearer ${clinicAdminToken()}`)
    .send({ phone: '+919876543210', user_id: 42 });

  const bookingId = sendRes.body.bookingId;

  // Verify OTP
  await request(app)
    .post('/api/clinic/booking/verify-otp')
    .set('Authorization', `Bearer ${clinicAdminToken()}`)
    .send({ bookingId, otp: capturedOTP });

  return bookingId;
}

describe('POST /api/clinic/booking/create-appointment', () => {
  test('creates appointment successfully', async () => {
    const bookingId = await createAuthenticatedBookingWithUser();

    // Mock getSlotById — slot belongs to clinic 8, day is MON
    getSlotById.mockResolvedValue({
      slot_id: 1, clinic_id: 8, doctor_id: 9, slot_fee: 500, booking_fee: 50,
      slot_day: 'MON', slot_start: 18, slot_end: 24,
    });

    // Mock pg queries for createAppointment
    mockQuery
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT FOR UPDATE (lock)
      .mockResolvedValueOnce({ rows: [{ next_index: 1 }] }) // MAX recommended_index
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // visit count
      .mockResolvedValueOnce({ rows: [] }) // last_visit_id
      .mockResolvedValueOnce({ rows: [{ // INSERT
        appointment_id: 100, user_id: 42, doctor_id: 9, slot_id: 1,
        recommended_index: 1, symptom_code: 'FEVER', symptom_text: 'High fever',
        complaints: 'General checkup', appointment_date: nextMonday,
        appointment_status: 'accepted', booking_fee_paid: 50, visit_no: 1,
        last_visit_id: null, booked_at: new Date().toISOString(),
      }] })
      .mockResolvedValueOnce(undefined); // COMMIT

    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({
        bookingId,
        slot_id: 1,
        appointment_date: nextMonday,
        symptom_code: 'FEVER',
        symptom_text: 'High fever for 3 days',
        complaints: 'General checkup',
        booking_fee_paid: 50,
        appointment_status: 'accepted',
      });

    expect(res.status).toBe(201);
    expect(res.body.appointment.appointment_id).toBe(100);
    expect(res.body.appointment.recommended_index).toBe(1);
    expect(res.body.appointment.visit_no).toBe(1);
  });

  test('rejects slot from another clinic → 403', async () => {
    const bookingId = await createAuthenticatedBookingWithUser();

    getSlotById.mockResolvedValue({
      slot_id: 99, clinic_id: 999, doctor_id: 5, slot_fee: 300, booking_fee: 30,
      slot_day: 'MON', slot_start: 12, slot_end: 18,
    });

    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({
        bookingId, slot_id: 99, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'Fever',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/belong/i);
  });

  test('rejects day-of-week mismatch → 400', async () => {
    const bookingId = await createAuthenticatedBookingWithUser();

    getSlotById.mockResolvedValue({
      slot_id: 1, clinic_id: 8, doctor_id: 9, slot_fee: 500, booking_fee: 50,
      slot_day: 'MON', slot_start: 18, slot_end: 24,
    });

    // nextTuesday is a Tuesday, slot is MON → mismatch
    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({
        bookingId, slot_id: 1, appointment_date: nextTuesday,
        symptom_code: 'FEVER', symptom_text: 'Fever',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/TUE.*MON/);
  });

  test('rejects invalid status → 400', async () => {
    const bookingId = await createAuthenticatedBookingWithUser();

    getSlotById.mockResolvedValue({
      slot_id: 1, clinic_id: 8, doctor_id: 9, slot_fee: 500, booking_fee: 50,
      slot_day: 'MON', slot_start: 18, slot_end: 24,
    });

    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({
        bookingId, slot_id: 1, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'Fever',
        appointment_status: 'completed',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/accepted.*waiting/i);
  });

  test('rejects without authenticated booking → 404/403', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({
        bookingId: 'bk_nonexistent', slot_id: 1, appointment_date: nextMonday,
        symptom_code: 'FEVER', symptom_text: 'Fever',
      });

    expect(res.status).toBe(404);
  });

  test('missing required fields → 400', async () => {
    const res = await request(app)
      .post('/api/clinic/booking/create-appointment')
      .set('Authorization', `Bearer ${clinicAdminToken()}`)
      .send({ bookingId: 'bk_something' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
});
