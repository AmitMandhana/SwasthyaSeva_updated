const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicsSQL = require('../init/initClinics');
const { DEV_MODE } = require('../../config/env');

const CLINIC_PUBLIC_FIELDS =
  'clinic_id, username, clinic_name, phone, license_no, pfp_link, verified, banner_link, street_address, city, state, pincode, country, location_x, location_y, is_deleted, created_at';

async function getClinics({ includeDeleted = false, search, username, name, phone, city, state } = {}) {
  return withTableGuard(async () => {
    let query = supabase.from('clinics').select(CLINIC_PUBLIC_FIELDS);
    if (!includeDeleted) query = query.eq('is_deleted', false);
    if (!DEV_MODE) query = query.not('username', 'ilike', 'e2e_%');

    if (username) query = query.ilike('username', `%${username}%`);
    if (name) query = query.ilike('clinic_name', `%${name}%`);
    if (phone) query = query.ilike('phone', `%${phone}%`);
    if (city) query = query.ilike('city', `%${city}%`);
    if (state) query = query.ilike('state', `%${state}%`);
    if (search) {
      query = query.or(`username.ilike.%${search}%,clinic_name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, initClinicsSQL);
}

async function getClinicById(clinicId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select(CLINIC_PUBLIC_FIELDS)
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initClinicsSQL);
}

module.exports = { getClinics, getClinicById };
