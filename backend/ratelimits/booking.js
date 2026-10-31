const { createRateLimit } = require('./rateLimiter');
const { DEV_MODE } = require('../config/env');

const bookingLookupLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: DEV_MODE ? 200 : 10,
  message: 'Too many lookup requests. Please try again shortly.',
});

const bookingOTPSendLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: DEV_MODE ? 100 : 3,
  message: 'Too many OTP requests. Please wait before trying again.',
});

const bookingOTPVerifyLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many verification attempts. Please try again shortly.',
});

module.exports = { bookingLookupLimit, bookingOTPSendLimit, bookingOTPVerifyLimit };
