const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSpecializationsSQL = require('../init/initSpecializations');

async function getSpecializations() {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('specializations')
        .select('specialization_code, name')
        .order('specialization_code');
    },
    initSpecializationsSQL
  );

  if (result.error) throw result.error;
  return result.data;
}

module.exports = { getSpecializations };
