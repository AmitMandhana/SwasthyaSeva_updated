const positiveInteger = require("../fields/positiveInteger");
const slotDay = require("../fields/slotDay");
const slotTime = require("../fields/slotTime");
const slotFee = require("../fields/slotFee");
const url = require("../fields/url");

module.exports = {
  clinic_id: { required: false, ...positiveInteger },
  doctor_id: { required: false, ...positiveInteger },
  slot_fee: { required: false, ...slotFee },
  booking_fee: { required: false, normalize: (v) => typeof v === 'string' ? parseInt(v, 10) : v, validate: (v) => typeof v !== 'number' || !Number.isInteger(v) || v < 0 ? 'Must be a non-negative integer' : null },
  slot_day: { required: false, ...slotDay },
  slot_start: { required: false, ...slotTime },
  slot_end: { required: false, ...slotTime },
  watermark_url: { required: false, ...url },
};
