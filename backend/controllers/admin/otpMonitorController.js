const { listPending: listLoginOTPs } = require('../../utils/pendingLoginOTPs');
const { listPending: listPatientOTPs } = require('../../utils/pendingPatientOTPs');
const { listPending: listRegistrationOTPs } = require('../../utils/pendingRegistrations');
const { listPending: listBookingOTPs } = require('../../utils/pendingBookings');
const { isDebugNumber } = require('../../utils/debugNumbers');
const { DEV_MODE } = require('../../config/env');

function getOtpStatus(req, res) {
  const loginOTPs = listLoginOTPs();
  const patientOTPs = [
    ...listPatientOTPs(),
    ...listRegistrationOTPs(),
    ...listBookingOTPs(),
  ];

  const debugNumbers = (process.env.DEBUG_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean);

  res.json({
    loginOTPs,
    patientOTPs,
    debugNumbers,
    devMode: DEV_MODE,
    serverTime: Date.now(),
  });
}

module.exports = { getOtpStatus };
