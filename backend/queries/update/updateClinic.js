const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicsSQL = require('../init/initClinics');

const CLINIC_PUBLIC_FIELDS =
  'clinic_id, username, clinic_name, phone, license_no, pfp_link, verified, banner_link, street_address, city, state, pincode, country, location_x, location_y, is_deleted, created_at';

async function updateClinic(clinicId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinics')
      .update(updates)
      .eq('clinic_id', clinicId)
      .select(CLINIC_PUBLIC_FIELDS)
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initClinicsSQL);
}

module.exports = { updateClinic };
