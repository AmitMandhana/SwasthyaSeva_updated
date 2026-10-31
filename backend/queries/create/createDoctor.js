const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');

/**
 * Inserts a new doctor record.
 * @param {Object} fields - All doctor columns (password_hash must be pre-hashed)
 * @returns {Promise<Object>} Created doctor row (without password_hash)
 */
async function createDoctor(fields) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('doctors')
        .insert(fields)
        .select(
          'doctor_id, username, first_name, last_name, phone, pfp_link, base_degree_code, postgrad_specialization_code, super_specialization_code, tag_1, tag_2, tag_3, bio, license_no, verified_doctor, banner_link, signature_link, prescription_format, is_deleted, created_at'
        )
        .single();

      if (error) throw error;
      return data;
    },
    initDoctorsSQL
  );
}

module.exports = { createDoctor };
