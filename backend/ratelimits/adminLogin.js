const { createRateLimit } = require('./rateLimiter');

// IP-based — applied before auth so admin_id is not yet known
const adminLoginRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

module.exports = { adminLoginRateLimit };
