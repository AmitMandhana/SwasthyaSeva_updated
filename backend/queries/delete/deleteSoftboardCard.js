const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function deleteSoftboardCard(cardId) {
  return withTableGuard(async () => {
    const { error } = await supabase
      .from('softboard_cards')
      .delete()
      .eq('card_id', cardId);
    if (error) throw error;
    return true;
  }, initSoftboardSQL);
}

module.exports = { deleteSoftboardCard };
