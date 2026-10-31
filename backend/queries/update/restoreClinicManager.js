const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicManagersSQL = require('../init/initClinicManagers');

/**
 * Restores a soft-deleted clinic manager by setting is_deleted = false.
 * @param {number} clinicAdminId
 * @returns {Promise<object|null>} restored row or null if not found
 */
async function restoreClinicManager(clinicAdminId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('clinic_admins')
        .update({ is_deleted: false })
        .eq('clinic_admin_id', clinicAdminId)
        .eq('is_deleted', true)
        .select('clinic_admin_id')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initClinicManagersSQL
  );
}

module.exports = { restoreClinicManager };
