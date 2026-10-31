const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicManagersSQL = require('../init/initClinicManagers');

const CM_PUBLIC_FIELDS =
  'clinic_admin_id, clinic_id, name, username, phone, pfp_link, is_deleted, created_at';

async function updateClinicManager(clinicAdminId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinic_admins')
      .update(updates)
      .eq('clinic_admin_id', clinicAdminId)
      .select(CM_PUBLIC_FIELDS)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initClinicManagersSQL);
}

module.exports = { updateClinicManager };
