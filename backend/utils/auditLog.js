function logAuthEvent(event, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    ...details
  };

  // Log to console (in production, send to proper logging service)
  console.log('🔐 AUTH EVENT:', JSON.stringify(logEntry));

  // TODO: In production, send to:
  // - CloudWatch Logs
  // - Application Insights
  // - Elastic Stack
  // - Or other centralized logging service
}

// Specific event types
const AuthEvents = {
  REGISTRATION_INITIATED: 'REGISTRATION_INITIATED',
  REGISTRATION_COMPLETED: 'REGISTRATION_COMPLETED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  CAPTCHA_REPLAY_DETECTED: 'CAPTCHA_REPLAY_DETECTED',
  CAPTCHA_EXPIRED: 'CAPTCHA_EXPIRED',
  CAPTCHA_ACTION_MISMATCH: 'CAPTCHA_ACTION_MISMATCH',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  ADMIN_ACTION: 'ADMIN_ACTION'
};

module.exports = {
  logAuthEvent,
  AuthEvents
};