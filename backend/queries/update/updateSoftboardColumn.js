const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function updateSoftboardColumn(columnId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('softboard_columns')
      .update(updates)
      .eq('column_id', columnId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initSoftboardSQL);
}

module.exports = { updateSoftboardColumn };
