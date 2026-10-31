const { DEV_MODE } = require('../config/env');
const pendingOTPs = new Map();
const OTP_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 3;
const RESEND_COOLDOWN = 60 * 1000; // 60 seconds

// Auto-cleanup expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingOTPs.entries()) {
    if (now - value.timestamp > OTP_TTL) {
      pendingOTPs.delete(key);
    }
  }
}, 60 * 1000);

function storePendingOTP({ phoneHash, nameHash, userId, phone, firstName }) {
  const existing = pendingOTPs.get(phoneHash);
  if (!DEV_MODE && existing && Date.now() - existing.otpSentAt < RESEND_COOLDOWN) {
    return { error: 'cooldown', retryAfter: Math.ceil((RESEND_COOLDOWN - (Date.now() - existing.otpSentAt)) / 1000) };
  }

  pendingOTPs.set(phoneHash, {
    phoneHash,
    nameHash,
    userId,
    phone,
    firstName,
    otp: null,
    otpAttempts: 0,
    otpSentAt: null,
    timestamp: Date.now(),
  });
  return { success: true };
}

function getPendingOTP(phoneHash) {
  const entry = pendingOTPs.get(phoneHash);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > OTP_TTL) {
    pendingOTPs.delete(phoneHash);
    return null;
  }
  return entry;
}

function updateOTP(phoneHash, otp) {
  const entry = pendingOTPs.get(phoneHash);
  if (!entry) return false;
  entry.otp = otp;
  entry.otpAttempts = 0;
  entry.otpSentAt = Date.now();
  return true;
}

function incrementAttempts(phoneHash) {
  const entry = pendingOTPs.get(phoneHash);
  if (!entry) return -1;
  entry.otpAttempts += 1;
  const remaining = MAX_OTP_ATTEMPTS - entry.otpAttempts;
  if (remaining <= 0) {
    pendingOTPs.delete(phoneHash);
  }
  return remaining;
}

function deletePendingOTP(phoneHash) {
  pendingOTPs.delete(phoneHash);
}

function clearAll() {
  pendingOTPs.clear();
}

function listPending() {
  const now = Date.now();
  const result = [];
  for (const [, entry] of pendingOTPs.entries()) {
    if (now - entry.timestamp > OTP_TTL) continue;
    result.push({
      phone: entry.phone,
      firstName: entry.firstName,
      userId: entry.userId,
      otp: entry.otp,
      attempts: entry.otpAttempts,
      maxAttempts: MAX_OTP_ATTEMPTS,
      sentAt: entry.otpSentAt,
      expiresAt: entry.timestamp + OTP_TTL,
      cooldownUntil: entry.otpSentAt ? entry.otpSentAt + RESEND_COOLDOWN : null,
    });
  }
  return result;
}

module.exports = {
  storePendingOTP,
  getPendingOTP,
  updateOTP,
  incrementAttempts,
  deletePendingOTP,
  clearAll,
  listPending,
};
