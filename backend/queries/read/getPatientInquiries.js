const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initPatientInquiriesSQL = require('../init/initPatientInquiries');

async function getPatientInquiries({ clinicId, status, source, search, limit = 50, offset = 0 }) {
  return withTableGuard(async () => {
    let query = supabase
      .from('patient_inquiries')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId);

    if (status) query = query.eq('status', status);
    if (source) query = query.eq('source', source);
    if (search) {
      query = query.or(`patient_name.ilike.%${search}%,patient_phone.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { inquiries: data || [], total: count || 0 };
  }, initPatientInquiriesSQL);
}

module.exports = { getPatientInquiries };
