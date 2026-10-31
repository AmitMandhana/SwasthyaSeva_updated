const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSlotsSQL = require('../init/initSlots');

async function deleteSlot(slotId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('slots')
      .update({ is_deleted: true })
      .eq('slot_id', slotId)
      .eq('is_deleted', false)
      .select('slot_id')
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }, initSlotsSQL);
}

module.exports = { deleteSlot };
