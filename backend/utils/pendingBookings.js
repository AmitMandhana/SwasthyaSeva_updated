// In-memory storage for pending booking sessions
// Each entry stores OTP state and patient context for the booking flow

const pendingBookings = new Map();

const BOOKING_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_ATTEMPTS = 3;

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingBookings.entries()) {
    if (now - value.timestamp > BOOKING_TTL) {
      pendingBookings.delete(key);
    }
  }
}, 60 * 1000);

function generateBookingId() {
  return `bk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function storePendingBooking({ phone, userId, clinicId, clinicAdminId, clinicName, adminName }) {
  const bookingId = generateBookingId();
  pendingBookings.set(bookingId, {
    phone,
    userId: userId || null,
    clinicId,
    clinicAdminId: clinicAdminId || null,
    clinicName: clinicName || null,
    adminName: adminName || null,
    otp: null,
    otpAttempts: 0,
    authenticated: false,
    registeredUserId: null,
    timestamp: Date.now(),
  });
  return bookingId;
}

function getPendingBooking(bookingId) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > BOOKING_TTL) {
    pendingBookings.delete(bookingId);
    return null;
  }

  return entry;
}

function updateBookingOTP(bookingId, otp) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return false;
  entry.otp = otp;
  entry.otpAttempts = 0;
  return true;
}

function incrementOTPAttempts(bookingId) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return -1;
  entry.otpAttempts++;
  return MAX_OTP_ATTEMPTS - entry.otpAttempts;
}

function markAuthenticated(bookingId) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return false;
  entry.authenticated = true;
  return true;
}

function setRegisteredUserId(bookingId, userId) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return false;
  entry.registeredUserId = userId;
  entry.userId = userId;
  return true;
}

function consumeBooking(bookingId) {
  const entry = pendingBookings.get(bookingId);
  if (!entry) return null;
  pendingBookings.delete(bookingId);
  return entry;
}

function deletePendingBooking(bookingId) {
  pendingBookings.delete(bookingId);
}

function listPending() {
  const now = Date.now();
  const result = [];
  for (const [, entry] of pendingBookings.entries()) {
    if (now - entry.timestamp > BOOKING_TTL) continue;
    if (!entry.otp) continue;
    result.push({
      phone: entry.phone,
      firstName: entry.adminName || '(booking)',
      otp: entry.otp,
      attempts: entry.otpAttempts,
      maxAttempts: MAX_OTP_ATTEMPTS,
      sentAt: entry.timestamp,
      expiresAt: entry.timestamp + BOOKING_TTL,
      source: 'booking',
      clinicName: entry.clinicName,
    });
  }
  return result;
}

module.exports = {
  storePendingBooking,
  getPendingBooking,
  updateBookingOTP,
  incrementOTPAttempts,
  markAuthenticated,
  setRegisteredUserId,
  consumeBooking,
  deletePendingBooking,
  listPending,
  BOOKING_TTL,
  MAX_OTP_ATTEMPTS,
};
