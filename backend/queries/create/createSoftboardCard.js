const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function createSoftboardCard({ column_id, title, description, link_text, link_url, position }) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('softboard_cards')
      .insert({ column_id, title, description: description || null, link_text: link_text || null, link_url: link_url || null, position })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, initSoftboardSQL);
}

module.exports = { createSoftboardCard };
