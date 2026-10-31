const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');

const DOCTOR_PUBLIC_FIELDS =
  'doctor_id, username, first_name, last_name, phone, pfp_link, base_degree_code, postgrad_specialization_code, super_specialization_code, tag_1, tag_2, tag_3, bio, license_no, verified_doctor, banner_link, signature_link, prescription_format, is_deleted, created_at';

/**
 * Updates allowed fields on a doctor row.
 * @param {number} doctorId
 * @param {Object} updates - Partial doctor fields (password_hash must be pre-hashed if provided)
 * @returns {Promise<Object|null>} Updated row or null if not found
 */
async function updateDoctor(doctorId, updates) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('doctor_id', doctorId)
        .select(DOCTOR_PUBLIC_FIELDS)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initDoctorsSQL
  );
}

module.exports = { updateDoctor };
