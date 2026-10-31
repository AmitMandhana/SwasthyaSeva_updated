const { getPool } = require('../../utils/pool');


/**
 * Get all examination records for a patient across all appointments.
 */
async function getExaminationHistory({ userId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT
         e.examination_id, e.user_id, e.height, e.weight,
         e.sp_systolic, e.bp_diastolic, e.heart_rate,
         e.respiratory_rate, e.oxygen_saturation, e.blood_sugar,
         a.appointment_date
       FROM examination_records e
       JOIN appointments a ON a.appointment_id = e.examination_id
       WHERE e.user_id = $1
       ORDER BY a.appointment_date DESC`,
      [userId]
    );
    return rows;
  } finally {
    client.release();
  }
}

/**
 * Get a single examination record by appointment ID.
 */
async function getExaminationByAppointment({ appointmentId }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      'SELECT * FROM examination_records WHERE examination_id = $1',
      [appointmentId]
    );
    return rows[0] || null;
  } finally {
    client.release();
  }
}

module.exports = { getExaminationHistory, getExaminationByAppointment };
