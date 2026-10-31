const positiveInteger = require("../fields/positiveInteger");
const slotDay = require("../fields/slotDay");
const slotTime = require("../fields/slotTime");
const slotFee = require("../fields/slotFee");

module.exports = {
  clinic_id: { required: true, ...positiveInteger },
  doctor_id: { required: true, ...positiveInteger },
  slot_fee: { required: true, ...slotFee },
  slot_day: { required: true, ...slotDay },
  slot_start: { required: true, ...slotTime },
  slot_end: { required: true, ...slotTime },
};
