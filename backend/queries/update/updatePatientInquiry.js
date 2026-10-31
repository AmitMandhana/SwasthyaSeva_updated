const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initPatientInquiriesSQL = require('../init/initPatientInquiries');

async function updatePatientInquiry(inquiryId, clinicId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('patient_inquiries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('inquiry_id', inquiryId)
      .eq('clinic_id', clinicId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initPatientInquiriesSQL);
}

module.exports = { updatePatientInquiry };
