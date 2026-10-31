const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorExtraQualificationsSQL = require('../init/initDoctorExtraQualifications');

/**
 * Create a doctor extra qualification entry
 * @param {Object} data - { doctor_id, qualification_code }
 * @returns {Promise<Object>} - Created doctor_extra_qualification record
 */
async function createDoctorExtraQualification(data) {
  return withTableGuard(async () => {
    const { data: result, error } = await supabase
      .from('doctor_extra_qualifications')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }, initDoctorExtraQualificationsSQL);
}

module.exports = { createDoctorExtraQualification };
