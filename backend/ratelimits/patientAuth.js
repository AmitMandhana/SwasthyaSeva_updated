const { createRateLimit } = require('./rateLimiter');

const patientLoginRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 1 minute.',
});

const patientOTPRequestRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 3,
  message: 'Too many OTP requests. Please try again in 1 minute.',
});

const patientOTPVerifyRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: 'Too many OTP verification attempts. Please try again in 1 minute.',
});

module.exports = { patientLoginRateLimit, patientOTPRequestRateLimit, patientOTPVerifyRateLimit };
