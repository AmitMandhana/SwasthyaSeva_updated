const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSlotsSQL = require('../init/initSlots');

/**
 * Restores a soft-deleted slot by setting is_deleted = false.
 * @param {number} slotId
 * @returns {Promise<object|null>} restored slot row or null if not found
 */
async function restoreSlot(slotId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('slots')
        .update({ is_deleted: false })
        .eq('slot_id', slotId)
        .eq('is_deleted', true)
        .select('slot_id')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initSlotsSQL
  );
}

module.exports = { restoreSlot };
