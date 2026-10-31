const { DEV_MODE } = require('./env');

module.exports = {
  admin: {
    tokenExpiryMinutes: 60,
    deviceLimit: DEV_MODE ? 20 : 2,
  },
  doctor: {
    tokenExpiry: '14d',
    tokenExpiryMs: 14 * 24 * 60 * 60 * 1000,
    deviceLimit: 3,
  },
  clinicAdmin: {
    tokenExpiry: '14d',
    tokenExpiryMs: 14 * 24 * 60 * 60 * 1000,
    deviceLimit: 1,
  },
  patient: {
    tokenExpiry: '14d',
    tokenExpiryMs: 14 * 24 * 60 * 60 * 1000,
    deviceLimit: 3,
  },
};
