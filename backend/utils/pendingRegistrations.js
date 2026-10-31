// In-memory storage for pending registrations
// Each entry stores: { userData, timestamp }

const pendingRegistrations = new Map();

const REGISTRATION_TTL = 5 * 60 * 1000;

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRegistrations.entries()) {
    if (now - value.timestamp > REGISTRATION_TTL) {
      pendingRegistrations.delete(key);
    }
  }
}, 60 * 1000);

function generateRegistrationId() {
  return `reg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function storePendingRegistration(userData, generatedPassword = null) {
  const registrationId = generateRegistrationId();
  pendingRegistrations.set(registrationId, {
    userData,
    generatedPassword,
    timestamp: Date.now(),
    otpRequested: false,
    otp: null,
    otpTimestamp: null,
    otpAttempts: 0
  });
  return registrationId;
}

function getPendingRegistration(registrationId) {
  const entry = pendingRegistrations.get(registrationId);
  if (!entry) return null;
  
  const now = Date.now();
  // Check if registration expired
  if (now - entry.timestamp > REGISTRATION_TTL) {
    pendingRegistrations.delete(registrationId);
    return null;
  }
  
  return entry;
}

function updateOTP(registrationId, otp) {
  const entry = pendingRegistrations.get(registrationId);
  if (!entry) return false;
  
  entry.otp = otp;
  entry.otpTimestamp = Date.now();
  entry.otpRequested = true;
  pendingRegistrations.set(registrationId, entry);
  return true;
}

function verifyAndConsume(registrationId) {
  const entry = pendingRegistrations.get(registrationId);
  if (!entry) return null;
  
  // Delete the entry (consume it)
  pendingRegistrations.delete(registrationId);
  return entry.userData;
}

function deletePendingRegistration(registrationId) {
  pendingRegistrations.delete(registrationId);
}

function incrementOTPAttempts(registrationId) {
  const entry = pendingRegistrations.get(registrationId);
  if (!entry) return false;
  
  entry.otpAttempts++;
  pendingRegistrations.set(registrationId, entry);
  return true;
}

function listPending() {
  const now = Date.now();
  const result = [];
  for (const [id, entry] of pendingRegistrations.entries()) {
    if (now - entry.timestamp > REGISTRATION_TTL) continue;
    if (!entry.otp) continue;
    const phone = entry.userData?.phone ? require('./pii').decrypt(entry.userData.phone) : null;
    const firstName = entry.userData?.first_name ? require('./pii').decrypt(entry.userData.first_name) : null;
    result.push({
      phone: phone || '(encrypted)',
      firstName: firstName || '(new patient)',
      otp: entry.otp,
      attempts: entry.otpAttempts,
      maxAttempts: 3,
      sentAt: entry.otpTimestamp,
      expiresAt: entry.timestamp + REGISTRATION_TTL,
      source: 'registration',
    });
  }
  return result;
}

module.exports = {
  storePendingRegistration,
  getPendingRegistration,
  updateOTP,
  verifyAndConsume,
  deletePendingRegistration,
  incrementOTPAttempts,
  listPending,
  REGISTRATION_TTL
};