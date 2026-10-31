const { getSoftboard } = require('../../queries/read/getSoftboard');
const { createSoftboardColumn } = require('../../queries/create/createSoftboardColumn');
const { createSoftboardCard } = require('../../queries/create/createSoftboardCard');
const { updateSoftboardColumn } = require('../../queries/update/updateSoftboardColumn');
const { updateSoftboardCard } = require('../../queries/update/updateSoftboardCard');
const { deleteSoftboardColumn } = require('../../queries/delete/deleteSoftboardColumn');
const { deleteSoftboardCard } = require('../../queries/delete/deleteSoftboardCard');

async function getBoard(req, res) {
  try {
    const board = await getSoftboard();
    return res.status(200).json({ columns: board });
  } catch (err) {
    console.error('[Softboard] GET error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function createColumn(req, res) {
  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'title is required' });
  }

  try {
    const board = await getSoftboard();
    const maxPos = board.reduce((max, col) => Math.max(max, col.position), -1);
    const column = await createSoftboardColumn({ title: title.trim(), position: maxPos + 1 });
    return res.status(201).json({ column });
  } catch (err) {
    console.error('[Softboard] Create column error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function patchColumn(req, res) {
  const columnId = parseInt(req.params.column_id, 10);
  if (!columnId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid column_id' });

  const { title } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'title is required' });
  }

  try {
    const col = await updateSoftboardColumn(columnId, { title: title.trim() });
    if (!col) return res.status(404).json({ error: 'Not Found', message: 'Column not found' });
    return res.status(200).json({ column: col });
  } catch (err) {
    console.error('[Softboard] Patch column error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function removeColumn(req, res) {
  const columnId = parseInt(req.params.column_id, 10);
  if (!columnId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid column_id' });

  try {
    await deleteSoftboardColumn(columnId);
    return res.status(200).json({ message: 'Column deleted' });
  } catch (err) {
    console.error('[Softboard] Delete column error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function reorderColumns(req, res) {
  const { columnIds } = req.body || {};
  if (!Array.isArray(columnIds) || columnIds.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'columnIds array is required' });
  }

  try {
    await Promise.all(columnIds.map((id, i) => updateSoftboardColumn(id, { position: i })));
    return res.status(200).json({ message: 'Columns reordered' });
  } catch (err) {
    console.error('[Softboard] Reorder columns error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function createCard(req, res) {
  const { column_id, title, description, link_text, link_url } = req.body || {};
  if (!column_id || !title || !title.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'column_id and title are required' });
  }

  try {
    const board = await getSoftboard();
    const col = board.find(c => c.column_id === column_id);
    const maxPos = col ? col.cards.reduce((max, card) => Math.max(max, card.position), -1) : -1;
    const card = await createSoftboardCard({ column_id, title: title.trim(), description: description || null, link_text: link_text || null, link_url: link_url || null, position: maxPos + 1 });
    return res.status(201).json({ card });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(404).json({ error: 'Not Found', message: 'Column not found' });
    }
    console.error('[Softboard] Create card error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function patchCard(req, res) {
  const cardId = parseInt(req.params.card_id, 10);
  if (!cardId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid card_id' });

  const updates = {};
  const { title, description, column_id, position, link_text, link_url } = req.body || {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (column_id !== undefined) updates.column_id = column_id;
  if (position !== undefined) updates.position = position;
  if (link_text !== undefined) updates.link_text = link_text || null;
  if (link_url !== undefined) updates.link_url = link_url || null;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided' });
  }

  try {
    const card = await updateSoftboardCard(cardId, updates);
    if (!card) return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
    return res.status(200).json({ card });
  } catch (err) {
    console.error('[Softboard] Patch card error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function removeCard(req, res) {
  const cardId = parseInt(req.params.card_id, 10);
  if (!cardId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid card_id' });

  try {
    await deleteSoftboardCard(cardId);
    return res.status(200).json({ message: 'Card deleted' });
  } catch (err) {
    console.error('[Softboard] Delete card error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function moveCard(req, res) {
  const { cardId, targetColumnId, targetPosition } = req.body || {};
  if (!cardId || !targetColumnId || targetPosition == null) {
    return res.status(400).json({ error: 'Bad Request', message: 'cardId, targetColumnId, and targetPosition are required' });
  }

  try {
    const card = await updateSoftboardCard(cardId, { column_id: targetColumnId, position: targetPosition });
    if (!card) return res.status(404).json({ error: 'Not Found', message: 'Card not found' });
    return res.status(200).json({ card });
  } catch (err) {
    console.error('[Softboard] Move card error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getBoard, createColumn, patchColumn, removeColumn, reorderColumns, createCard, patchCard, removeCard, moveCard };
