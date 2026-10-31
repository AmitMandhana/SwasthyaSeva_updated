const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorExtraQualificationsSQL = require('../init/initDoctorExtraQualifications');

/**
 * Delete a doctor extra qualification entry
 * @param {number} doctorId - The doctor's ID
 * @param {string} qualificationCode - The qualification code
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
async function deleteDoctorExtraQualification(doctorId, qualificationCode) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('doctor_extra_qualifications')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('qualification_code', qualificationCode)
      .select();

    if (error) throw error;
    return data && data.length > 0;
  }, initDoctorExtraQualificationsSQL);
}

module.exports = { deleteDoctorExtraQualification };
