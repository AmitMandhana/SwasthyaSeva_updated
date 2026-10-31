const { getPool } = require('../../utils/pool');


/**
 * Get prescription by appointment ID.
 */
async function getPrescription({ appointmentId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'SELECT * FROM prescriptions WHERE prescription_id = $1',
      [appointmentId]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { getPrescription };
