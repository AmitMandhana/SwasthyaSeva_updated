const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicsSQL = require('../init/initClinics');

/**
 * Restores a soft-deleted clinic by setting is_deleted = false.
 * @param {number} clinicId
 * @returns {Promise<object|null>} restored clinic row or null if not found
 */
async function restoreClinic(clinicId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('clinics')
        .update({ is_deleted: false })
        .eq('clinic_id', clinicId)
        .eq('is_deleted', true)
        .select('clinic_id')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initClinicsSQL
  );
}

module.exports = { restoreClinic };
