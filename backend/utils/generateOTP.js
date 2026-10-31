const { isDebugNumber } = require('./debugNumbers');
const { DEV_MODE, OTP_BYPASS } = require('../config/env');

function generateOTP(phone) {
  if (DEV_MODE || OTP_BYPASS) return '123456';
  if (phone && isDebugNumber(phone)) return '123456';
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generateOTP };
