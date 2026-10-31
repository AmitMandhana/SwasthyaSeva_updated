const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function deleteSoftboardColumn(columnId) {
  return withTableGuard(async () => {
    const { error } = await supabase
      .from('softboard_columns')
      .delete()
      .eq('column_id', columnId);
    if (error) throw error;
    return true;
  }, initSoftboardSQL);
}

module.exports = { deleteSoftboardColumn };
