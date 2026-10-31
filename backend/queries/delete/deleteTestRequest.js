const { getPool } = require('../../utils/pool');


/**
 * Delete a test request by ID. Returns deleted row or null.
 */
async function deleteTestRequest({ requestId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'DELETE FROM test_requests WHERE request_id = $1 RETURNING *',
      [requestId]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { deleteTestRequest };
