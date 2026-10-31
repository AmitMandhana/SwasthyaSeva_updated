const { getPool } = require('../../utils/pool');


/**
 * Create a lab test request for an appointment.
 */
async function createTestRequest({ userId, appointmentId, testName }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO test_requests (user_id, appointment_id, test_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, appointmentId, testName]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

module.exports = { createTestRequest };
