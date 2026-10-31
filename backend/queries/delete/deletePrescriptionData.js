const { getPool } = require('../../utils/pool');


/**
 * Transactionally delete all prescription data for an appointment:
 * medications, test_requests, examination_records, prescriptions.
 */
async function deletePrescriptionData({ appointmentId }) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM medications WHERE appointment_id = $1', [appointmentId]);
    await client.query('DELETE FROM test_requests WHERE appointment_id = $1', [appointmentId]);
    await client.query('DELETE FROM examination_records WHERE examination_id = $1', [appointmentId]);
    await client.query('DELETE FROM prescriptions WHERE prescription_id = $1', [appointmentId]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { deletePrescriptionData };
