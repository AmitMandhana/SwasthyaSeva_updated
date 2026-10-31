const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initTagsSQL = require('../init/initTags');

async function getTags() {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('tags')
        .select('tag_code, name')
        .order('tag_code');
    },
    initTagsSQL
  );

  if (result.error) throw result.error;
  return result.data;
}

module.exports = { getTags };
