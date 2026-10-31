const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');


function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * Fetch today's appointment queue for a doctor.
 * Joins: appointments → slots → users
 */
async function getAppointmentsByDoctor({ doctorId, date }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT
         a.appointment_id, a.user_id, a.symptom_code, a.symptom_text,
         sym.name AS symptom_name,
         a.complaints, a.appointment_status, a.recommended_index,
         a.slot_id, a.appointment_date,
         s.clinic_id,
         u.first_name, u.last_name, u.dob, u.gender
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       JOIN users u ON u.user_id = a.user_id
       LEFT JOIN symptoms sym ON a.symptom_code = sym.symptom_code
       WHERE s.doctor_id = $1
         AND a.appointment_date = $2
       ORDER BY a.recommended_index ASC`,
      [doctorId, date]
    );

    return rows.map(r => ({
      appointment_id: r.appointment_id,
      user_id: r.user_id,
      patient_name: `${tryDecrypt(r.first_name) || ''} ${tryDecrypt(r.last_name) || ''}`.trim(),
      dob: r.dob,
      gender: r.gender,
      symptom_code: r.symptom_code,
      symptom_name: r.symptom_name || r.symptom_code,
      symptom_text: r.symptom_text,
      complaints: r.complaints,
      appointment_status: r.appointment_status,
      recommended_index: r.recommended_index,
      slot_id: r.slot_id,
      clinic_id: r.clinic_id,
      appointment_date: r.appointment_date,
    }));
  } finally {
    client.release();
  }
}

/**
 * Fetch appointments for a doctor within a date range, including clinic name.
 * Joins: appointments → slots → users, slots → clinics
 */
async function getAppointmentsByDoctorRange({ doctorId, dateFrom, dateTo, clinicIds, search }) {
  const client = await getPool().connect();
  try {
    const params = [doctorId, dateFrom, dateTo];
    let where = `s.doctor_id = $1 AND a.appointment_date BETWEEN $2 AND $3`;

    if (clinicIds && clinicIds.length > 0) {
      params.push(clinicIds);
      where += ` AND s.clinic_id = ANY($${params.length})`;
    }

    const { rows } = await client.query(
      `SELECT
         a.appointment_id, a.user_id, a.symptom_code, a.symptom_text,
         sym.name AS symptom_name,
         a.complaints, a.appointment_status, a.recommended_index,
         a.slot_id, a.appointment_date,
         s.clinic_id,
         c.clinic_name,
         u.first_name, u.last_name, u.dob, u.gender, u.phone
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       JOIN clinics c ON c.clinic_id = s.clinic_id
       JOIN users u ON u.user_id = a.user_id
       LEFT JOIN symptoms sym ON a.symptom_code = sym.symptom_code
       WHERE ${where}
       ORDER BY a.appointment_date ASC, a.recommended_index ASC`,
      params
    );

    let results = rows.map(r => ({
      appointment_id: r.appointment_id,
      user_id: r.user_id,
      patient_name: `${tryDecrypt(r.first_name) || ''} ${tryDecrypt(r.last_name) || ''}`.trim(),
      dob: r.dob,
      gender: r.gender,
      symptom_code: r.symptom_code,
      symptom_name: r.symptom_name || r.symptom_code,
      symptom_text: r.symptom_text,
      complaints: r.complaints,
      appointment_status: r.appointment_status,
      recommended_index: r.recommended_index,
      slot_id: r.slot_id,
      clinic_id: r.clinic_id,
      clinic_name: r.clinic_name,
      appointment_date: r.appointment_date,
    }));

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.patient_name.toLowerCase().includes(q) ||
        r.clinic_name.toLowerCase().includes(q) ||
        r.symptom_text?.toLowerCase().includes(q) ||
        r.complaints?.toLowerCase().includes(q)
      );
    }

    return results;
  } finally {
    client.release();
  }
}

module.exports = { getAppointmentsByDoctor, getAppointmentsByDoctorRange };
