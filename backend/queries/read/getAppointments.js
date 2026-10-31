const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');


function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * Fetch appointments for a clinic with optional filters.
 * Joins: appointments → slots (for clinic_id) → doctors → users
 */
async function getAppointmentsByClinic({ clinicId, status, dateFrom, dateTo, doctorId, limit = 50, offset = 0 }) {
  const conditions = ['s.clinic_id = $1'];
  const params = [clinicId];
  let paramIdx = 2;

  if (status) {
    conditions.push(`a.appointment_status = $${paramIdx++}`);
    params.push(status);
  }
  if (dateFrom) {
    conditions.push(`a.appointment_date >= $${paramIdx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`a.appointment_date <= $${paramIdx++}`);
    params.push(dateTo);
  }
  if (doctorId) {
    conditions.push(`a.doctor_id = $${paramIdx++}`);
    params.push(Number(doctorId));
  }

  const whereClause = conditions.join(' AND ');

  const countSql = `
    SELECT COUNT(*) AS total
    FROM appointments a
    JOIN slots s ON a.slot_id = s.slot_id
    WHERE ${whereClause}
  `;

  const dataSql = `
    SELECT
      a.appointment_id, a.user_id, a.doctor_id, a.slot_id,
      a.recommended_index, a.appointment_index,
      a.symptom_code, a.symptom_text, sym.name AS symptom_name,
      a.visit_no, a.appointment_status,
      a.start_time, a.end_time,
      a.appointment_date, a.booked_at,
      s.slot_day, s.slot_start, s.slot_end, s.slot_fee,
      d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.username AS doctor_username,
      u.first_name AS patient_first_name, u.last_name AS patient_last_name
    FROM appointments a
    JOIN slots s ON a.slot_id = s.slot_id
    LEFT JOIN doctors d ON a.doctor_id = d.doctor_id
    LEFT JOIN users u ON a.user_id = u.user_id
    LEFT JOIN symptoms sym ON a.symptom_code = sym.symptom_code
    WHERE ${whereClause}
    ORDER BY a.appointment_date DESC, s.slot_start ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  params.push(Number(limit), Number(offset));

  const client = await getPool().connect();
  try {
    const [countResult, dataResult] = await Promise.all([
      client.query(countSql, params.slice(0, paramIdx - 3)),
      client.query(dataSql, params),
    ]);

    return {
      appointments: dataResult.rows.map(r => ({
        appointment_id: r.appointment_id,
        patient_name: r.patient_first_name && r.patient_last_name
          ? `${tryDecrypt(r.patient_first_name)} ${tryDecrypt(r.patient_last_name)}` : 'Unknown',
        doctor_name: r.doctor_first_name && r.doctor_last_name
          ? `Dr. ${r.doctor_first_name} ${r.doctor_last_name}` : 'N/A',
        doctor_username: r.doctor_username,
        appointment_date: r.appointment_date,
        appointment_status: r.appointment_status,
        slot_day: r.slot_day,
        slot_start: r.slot_start,
        slot_end: r.slot_end,
        slot_fee: r.slot_fee,
        symptom_code: r.symptom_code,
        symptom_name: r.symptom_name || r.symptom_code,
        symptom_text: r.symptom_text,
        visit_no: r.visit_no,
        booked_at: r.booked_at,
      })),
      total: parseInt(countResult.rows[0].total, 10),
    };
  } finally {
    client.release();
  }
}

/**
 * Get appointment counts by status for a clinic.
 */
async function getAppointmentStats(clinicId) {
  const sql = `
    SELECT a.appointment_status AS status, COUNT(*) AS count
    FROM appointments a
    JOIN slots s ON a.slot_id = s.slot_id
    WHERE s.clinic_id = $1
    GROUP BY a.appointment_status
  `;

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, [clinicId]);
    const stats = { pending: 0, in_progress: 0, completed: 0, missed: 0, cancelled: 0 };
    for (const row of rows) {
      if (row.status in stats) stats[row.status] = parseInt(row.count, 10);
    }
    return stats;
  } finally {
    client.release();
  }
}

module.exports = { getAppointmentsByClinic, getAppointmentStats };
