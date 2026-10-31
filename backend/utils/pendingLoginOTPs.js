const pendingLogins = new Map();
const OTP_TTL = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingLogins.entries()) {
    if (now - value.timestamp > OTP_TTL) {
      pendingLogins.delete(key);
    }
  }
}, 60 * 1000);

function storePendingLogin({ loginId, role, phone, tokenPayload }) {
  const existing = pendingLogins.get(loginId);
  if (existing && Date.now() - existing.otpSentAt < RESEND_COOLDOWN) {
    return { error: 'cooldown', retryAfter: Math.ceil((RESEND_COOLDOWN - (Date.now() - existing.otpSentAt)) / 1000) };
  }

  pendingLogins.set(loginId, {
    loginId,
    role,
    phone,
    tokenPayload,
    otp: null,
    otpAttempts: 0,
    otpSentAt: null,
    timestamp: Date.now(),
  });
  return { success: true };
}

function getPendingLogin(loginId) {
  const entry = pendingLogins.get(loginId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > OTP_TTL) {
    pendingLogins.delete(loginId);
    return null;
  }
  return entry;
}

function updateLoginOTP(loginId, otp) {
  const entry = pendingLogins.get(loginId);
  if (!entry) return false;
  entry.otp = otp;
  entry.otpAttempts = 0;
  entry.otpSentAt = Date.now();
  return true;
}

function incrementLoginAttempts(loginId) {
  const entry = pendingLogins.get(loginId);
  if (!entry) return -1;
  entry.otpAttempts += 1;
  const remaining = MAX_ATTEMPTS - entry.otpAttempts;
  if (remaining <= 0) {
    pendingLogins.delete(loginId);
  }
  return remaining;
}

function deletePendingLogin(loginId) {
  pendingLogins.delete(loginId);
}

function clearAll() {
  pendingLogins.clear();
}

function listPending() {
  const now = Date.now();
  const result = [];
  for (const [, entry] of pendingLogins.entries()) {
    if (now - entry.timestamp > OTP_TTL) continue;
    result.push({
      loginId: entry.loginId,
      role: entry.role,
      phone: entry.phone,
      otp: entry.otp,
      attempts: entry.otpAttempts,
      maxAttempts: MAX_ATTEMPTS,
      sentAt: entry.otpSentAt,
      expiresAt: entry.timestamp + OTP_TTL,
      cooldownUntil: entry.otpSentAt ? entry.otpSentAt + RESEND_COOLDOWN : null,
    });
  }
  return result;
}

module.exports = {
  storePendingLogin,
  getPendingLogin,
  updateLoginOTP,
  incrementLoginAttempts,
  deletePendingLogin,
  clearAll,
  listPending,
};
