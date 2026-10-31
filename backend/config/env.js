const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const DEV_MODE = process.env.DEV_MODE === 'true';

// DEV_MODE disables OTP delivery, rate limits, and mounts unauthenticated
// /api/test/* mutation routes. It must never be reachable in production.
if (DEV_MODE && IS_PRODUCTION) {
  throw new Error('DEV_MODE must not be enabled in production');
}

module.exports = { DEV_MODE, IS_PRODUCTION };
