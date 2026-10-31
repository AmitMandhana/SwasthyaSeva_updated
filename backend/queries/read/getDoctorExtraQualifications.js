const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorExtraQualificationsSQL = require('../init/initDoctorExtraQualifications');

/**
 * Get all extra qualifications for a specific doctor
 * @param {number} doctorId - The doctor's ID
 * @returns {Promise<Array>} - Array of extra qualification records
 */
async function getDoctorExtraQualifications(doctorId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('doctor_extra_qualifications')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('qualification_code', { ascending: true });

    if (error) throw error;
    return data || [];
  }, initDoctorExtraQualificationsSQL);
}

module.exports = { getDoctorExtraQualifications };
