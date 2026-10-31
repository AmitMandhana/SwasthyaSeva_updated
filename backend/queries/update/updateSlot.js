const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSlotsSQL = require('../init/initSlots');

const SLOT_PUBLIC_FIELDS =
  'slot_id, clinic_id, doctor_id, slot_fee, slot_day, slot_start, slot_end, watermark_url';

async function updateSlot(slotId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('slots')
      .update(updates)
      .eq('slot_id', slotId)
      .select(SLOT_PUBLIC_FIELDS)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initSlotsSQL);
}

module.exports = { updateSlot };
