const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');

/**
 * Soft-deletes a doctor by setting is_deleted = true.
 * @param {number} doctorId
 * @returns {Promise<boolean>} true if a row was updated, false if not found
 */
async function softDeleteDoctor(doctorId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('doctors')
        .update({ is_deleted: true })
        .eq('doctor_id', doctorId)
        .eq('is_deleted', false)
        .select('doctor_id')
        .maybeSingle();

      if (error) throw error;
      return data !== null;
    },
    initDoctorsSQL
  );
}

module.exports = { softDeleteDoctor };
