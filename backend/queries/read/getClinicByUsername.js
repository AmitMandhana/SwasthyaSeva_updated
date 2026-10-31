const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicsSQL = require('../init/initClinics');

const CLINIC_PROFILE_FIELDS =
  'clinic_id, username, clinic_name, phone, license_no, pfp_link, verified, banner_link, street_address, city, state, pincode, country, location_x, location_y';

/**
 * Returns a clinic's ID and basic info by username (exact match, case-insensitive).
 * @param {string} username
 * @returns {Promise<{ clinic_id: number, clinic_name: string }|null>}
 */
async function getClinicByUsername(username) {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('clinics')
        .select('clinic_id, clinic_name')
        .ilike('username', username.trim())
        .eq('is_deleted', false)
        .maybeSingle();
    },
    initClinicsSQL
  );
  if (result.error) throw result.error;
  return result.data;
}

/**
 * Returns a full public clinic profile by username.
 * Only returns non-deleted clinics.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getClinicProfileByUsername(username) {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('clinics')
        .select(CLINIC_PROFILE_FIELDS)
        .ilike('username', username.trim())
        .eq('is_deleted', false)
        .maybeSingle();
    },
    initClinicsSQL
  );
  if (result.error) throw result.error;
  return result.data;
}

module.exports = { getClinicByUsername, getClinicProfileByUsername };
