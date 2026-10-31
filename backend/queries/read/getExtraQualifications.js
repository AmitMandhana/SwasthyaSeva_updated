const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initExtraQualificationsSQL = require('../init/initExtraQualifications');

async function getExtraQualifications() {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('extra_qualifications')
        .select('qualification_code, name, type')
        .order('qualification_code');
    },
    initExtraQualificationsSQL
  );

  if (result.error) throw result.error;
  return result.data;
}

module.exports = { getExtraQualifications };
