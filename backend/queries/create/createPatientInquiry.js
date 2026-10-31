const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initPatientInquiriesSQL = require('../init/initPatientInquiries');

async function createPatientInquiry(data) {
  return withTableGuard(async () => {
    const { data: row, error } = await supabase
      .from('patient_inquiries')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return row;
  }, initPatientInquiriesSQL);
}

module.exports = { createPatientInquiry };
