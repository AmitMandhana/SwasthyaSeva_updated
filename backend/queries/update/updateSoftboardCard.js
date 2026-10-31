const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function updateSoftboardCard(cardId, updates) {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('softboard_cards')
      .update(updates)
      .eq('card_id', cardId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }, initSoftboardSQL);
}

module.exports = { updateSoftboardCard };
