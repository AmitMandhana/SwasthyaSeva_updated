const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSoftboardSQL = require('../init/initSoftboard');

async function getSoftboard() {
  return withTableGuard(async () => {
    const { data: columns, error: colErr } = await supabase
      .from('softboard_columns')
      .select('*')
      .order('position', { ascending: true });
    if (colErr) throw colErr;

    const { data: cards, error: cardErr } = await supabase
      .from('softboard_cards')
      .select('*')
      .order('position', { ascending: true });
    if (cardErr) throw cardErr;

    const cardsByColumn = {};
    for (const card of (cards || [])) {
      if (!cardsByColumn[card.column_id]) cardsByColumn[card.column_id] = [];
      cardsByColumn[card.column_id].push(card);
    }

    return (columns || []).map(col => ({
      ...col,
      cards: cardsByColumn[col.column_id] || [],
    }));
  }, initSoftboardSQL);
}

module.exports = { getSoftboard };
