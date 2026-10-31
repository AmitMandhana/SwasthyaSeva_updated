const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const DEV_MODE = process.env.DEV_MODE === 'true';
const OTP_BYPASS = process.env.OTP_BYPASS === 'true';

// DEV_MODE disables OTP delivery, rate limits, and mounts unauthenticated
// /api/test/* mutation routes. It must never be reachable in production.
if (DEV_MODE && IS_PRODUCTION) {
  throw new Error('DEV_MODE must not be enabled in production');
}

// OTP_BYPASS forces the fixed OTP 123456 and skips all provider calls.
if (OTP_BYPASS && IS_PRODUCTION) {
  throw new Error('OTP_BYPASS must not be enabled in production');
}

module.exports = { DEV_MODE, OTP_BYPASS, IS_PRODUCTION };
