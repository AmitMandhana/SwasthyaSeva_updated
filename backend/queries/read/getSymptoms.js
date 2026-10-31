const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSymptomsSQL = require('../init/initSymptoms');

async function getSymptoms() {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('symptoms')
      .select('symptom_code, name')
      .order('name');
    if (error) throw error;
    return data || [];
  }, initSymptomsSQL);
}

module.exports = { getSymptoms };
