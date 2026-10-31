const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSlotsSQL = require('../init/initSlots');

const SLOT_PUBLIC_FIELDS =
  'slot_id, clinic_id, doctor_id, slot_fee, booking_fee, slot_day, slot_start, slot_end, watermark_url';

async function createSlot(fields) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('slots')
        .insert(fields)
        .select(SLOT_PUBLIC_FIELDS)
        .single();
      if (error) throw error;
      return data;
    },
    initSlotsSQL
  );
}

module.exports = { createSlot };
