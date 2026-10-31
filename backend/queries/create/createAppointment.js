const { getPool } = require('../../utils/pool');


/**
 * Create an appointment within a transaction.
 * Auto-calculates recommended_index, visit_no, and last_visit_id.
 */
async function createAppointment({
  userId, doctorId, slotId, symptomCode, symptomText, complaints,
  recommendedTime, appointmentDate, appointmentStatus, bookingFeePaid,
}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // 1. Lock existing rows for this slot+date, then calculate next index
    await client.query(
      `SELECT appointment_id FROM appointments
       WHERE slot_id = $1 AND appointment_date = $2
       FOR UPDATE`,
      [slotId, appointmentDate]
    );
    const indexResult = await client.query(
      `SELECT COALESCE(MAX(recommended_index), 0) + 1 AS next_index
       FROM appointments
       WHERE slot_id = $1 AND appointment_date = $2`,
      [slotId, appointmentDate]
    );
    const recommendedIndex = indexResult.rows[0].next_index;

    // 2. Calculate visit_no (how many times this patient visited this doctor + 1)
    const visitResult = await client.query(
      `SELECT COUNT(*) AS count FROM appointments WHERE user_id = $1 AND doctor_id = $2`,
      [userId, doctorId]
    );
    const visitNo = parseInt(visitResult.rows[0].count, 10) + 1;

    // 3. Find last_visit_id (most recent appointment for this patient+doctor)
    const lastVisitResult = await client.query(
      `SELECT appointment_id FROM appointments
       WHERE user_id = $1 AND doctor_id = $2
       ORDER BY appointment_date DESC, booked_at DESC
       LIMIT 1`,
      [userId, doctorId]
    );
    const lastVisitId = lastVisitResult.rows[0]?.appointment_id || null;

    // 4. Insert appointment
    const insertResult = await client.query(
      `INSERT INTO appointments (
        user_id, doctor_id, slot_id, recommended_index, symptom_code, symptom_text,
        complaints, recommended_time, appointment_date, appointment_status,
        booking_fee_paid, visit_no, last_visit_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING appointment_id, user_id, doctor_id, slot_id, recommended_index,
        symptom_code, symptom_text, complaints, recommended_time,
        appointment_date, appointment_status, booking_fee_paid, visit_no,
        last_visit_id, booked_at`,
      [
        userId, doctorId, slotId, recommendedIndex, symptomCode, symptomText || '',
        complaints || null, recommendedTime || null, appointmentDate,
        appointmentStatus || 'accepted', bookingFeePaid || 0, visitNo, lastVisitId,
      ]
    );

    await client.query('COMMIT');
    return insertResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createAppointment };
