const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function createSoftboardColumn({ title, position }) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('softboard_columns')
      .insert({ title, position })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, initSoftboardSQL);
}

module.exports = { createSoftboardColumn };
