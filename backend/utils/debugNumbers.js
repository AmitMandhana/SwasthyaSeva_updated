const { IS_PRODUCTION } = require('../config/env');

const debugNumbers = new Set(
  (process.env.DEBUG_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean)
);

function isDebugNumber(phone) {
  if (IS_PRODUCTION) return false;
  return debugNumbers.has(phone);
}

module.exports = { isDebugNumber };
