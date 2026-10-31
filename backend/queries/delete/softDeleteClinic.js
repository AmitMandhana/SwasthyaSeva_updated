const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initClinicsSQL = require('../init/initClinics');

async function softDeleteClinic(clinicId) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('clinics')
      .update({ is_deleted: true })
      .eq('clinic_id', clinicId)
      .eq('is_deleted', false)
      .select('clinic_id')
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }, initClinicsSQL);
}

module.exports = { softDeleteClinic };
