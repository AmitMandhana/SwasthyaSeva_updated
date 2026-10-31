const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicManagersSQL = require('../init/initClinicManagers');
const { DEV_MODE } = require('../../config/env');

const CM_PUBLIC_FIELDS =
  'clinic_admin_id, clinic_id, name, username, phone, pfp_link, is_deleted, created_at';

async function getClinicManagers({ clinicId = null, includeDeleted = false, search, name, username, phone, clinic_username } = {}) {
  return withTableGuard(async () => {
    // Resolve clinic_username → clinic_id if provided
    if (clinic_username && clinicId === null) {
      const { data: clinic } = await supabase
        .from('clinics')
        .select('clinic_id')
        .ilike('username', `%${clinic_username}%`)
        .limit(1)
        .maybeSingle();
      if (clinic) clinicId = clinic.clinic_id;
      else return []; // no matching clinic → no results
    }

    let query = supabase.from('clinic_admins').select(CM_PUBLIC_FIELDS);
    if (clinicId !== null) query = query.eq('clinic_id', clinicId);
    if (!includeDeleted) query = query.eq('is_deleted', false);
    if (!DEV_MODE) query = query.not('username', 'ilike', 'e2e_%');

    if (name) query = query.ilike('name', `%${name}%`);
    if (username) query = query.ilike('username', `%${username}%`);
    if (phone) query = query.ilike('phone', `%${phone}%`);
    if (search) {
      query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, initClinicManagersSQL);
}

async function getClinicManagerById(clinicAdminId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinic_admins')
      .select(CM_PUBLIC_FIELDS)
      .eq('clinic_admin_id', clinicAdminId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initClinicManagersSQL);
}

module.exports = { getClinicManagers, getClinicManagerById };
