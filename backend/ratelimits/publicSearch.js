const { createRateLimit } = require('./rateLimiter');

const publicSearchRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,   // 1 minute window
  max: 20,                     // 20 searches per minute per IP
  message: 'Too many search requests. Please try again shortly.',
});

const publicTagsRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many requests. Please try again shortly.',
});

const publicProfileRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many profile requests. Please try again shortly.',
});

const publicInquiryRateLimit = createRateLimit({
  mode: 'ip',
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many inquiry submissions. Please try again shortly.',
});

module.exports = { publicSearchRateLimit, publicTagsRateLimit, publicProfileRateLimit, publicInquiryRateLimit };
