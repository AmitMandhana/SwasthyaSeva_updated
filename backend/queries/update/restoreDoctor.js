const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');

/**
 * Restores a soft-deleted doctor by setting is_deleted = false.
 * @param {number} doctorId
 * @returns {Promise<object|null>} restored doctor row or null if not found
 */
async function restoreDoctor(doctorId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('doctors')
        .update({ is_deleted: false })
        .eq('doctor_id', doctorId)
        .eq('is_deleted', true)
        .select('doctor_id')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initDoctorsSQL
  );
}

module.exports = { restoreDoctor };
