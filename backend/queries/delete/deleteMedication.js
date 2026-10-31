const { getPool } = require('../../utils/pool');


/**
 * Delete a single medication by ID. Returns deleted row or null.
 */
async function deleteMedication({ medicationId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'DELETE FROM medications WHERE medication_id = $1 RETURNING *',
      [medicationId]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { deleteMedication };
