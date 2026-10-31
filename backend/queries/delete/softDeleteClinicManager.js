const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicManagersSQL = require('../init/initClinicManagers');

async function softDeleteClinicManager(clinicAdminId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinic_admins')
      .update({ is_deleted: true })
      .eq('clinic_admin_id', clinicAdminId)
      .eq('is_deleted', false)
      .select('clinic_admin_id')
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }, initClinicManagersSQL);
}

module.exports = { softDeleteClinicManager };
