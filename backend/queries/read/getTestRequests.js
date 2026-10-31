const { getPool } = require('../../utils/pool');


/**
 * Get all test requests for an appointment.
 */
async function getTestRequests({ appointmentId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'SELECT * FROM test_requests WHERE appointment_id = $1 ORDER BY request_id',
      [appointmentId]
    );
    return rows;
  } finally {
    client.release();
  }
}

module.exports = { getTestRequests };
