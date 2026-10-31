const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');


function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * GET /api/patient/appointments
 * Query params: ?status=upcoming|past, dateFrom, dateTo, hasPrescription=true, limit, offset
 */
async function listAppointments(req, res) {
  try {
    const { status = 'upcoming', dateFrom, dateTo, hasPrescription, limit = '20', offset = '0' } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    const params = [req.userId];
    let paramIdx = 2;

    let dateCondition;
    let statusCondition;

    if (status === 'past') {
      dateCondition = `(a.appointment_date < $${paramIdx}`;
      params.push(today);
      paramIdx++;
      statusCondition = ` OR a.appointment_status IN ('completed', 'cancelled', 'missed'))`;
    } else {
      dateCondition = `(a.appointment_date >= $${paramIdx}`;
      params.push(today);
      paramIdx++;
      statusCondition = ` AND a.appointment_status NOT IN ('completed', 'cancelled', 'missed'))`;
    }

    let extraConditions = '';
    if (dateFrom) {
      extraConditions += ` AND a.appointment_date >= $${paramIdx}`;
      params.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      extraConditions += ` AND a.appointment_date <= $${paramIdx}`;
      params.push(dateTo);
      paramIdx++;
    }

    let prescriptionJoin = 'LEFT JOIN prescriptions p ON p.prescription_id = a.appointment_id';
    let prescriptionFilter = '';
    if (hasPrescription === 'true') {
      prescriptionFilter = ' AND p.prescription_id IS NOT NULL';
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const client = await getPool().connect();
    try {
      const { rows } = await client.query(
        `SELECT
           a.appointment_id, a.appointment_date, a.appointment_status,
           a.symptom_text, a.complaints,
           s.slot_day, s.slot_start, s.slot_end, s.slot_fee,
           d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
           c.clinic_name,
           CASE WHEN p.prescription_id IS NOT NULL THEN true ELSE false END AS has_prescription
         FROM appointments a
         JOIN slots s ON s.slot_id = a.slot_id
         JOIN doctors d ON d.doctor_id = s.doctor_id
         JOIN clinics c ON c.clinic_id = s.clinic_id
         ${prescriptionJoin}
         WHERE a.user_id = $1
           AND ${dateCondition}${statusCondition}
           ${extraConditions}
           ${prescriptionFilter}
         ORDER BY a.appointment_date ${status === 'past' ? 'DESC' : 'ASC'}
         LIMIT ${lim} OFFSET ${off}`,
        params
      );

      const appointments = rows.map(r => ({
        appointment_id: r.appointment_id,
        appointment_date: r.appointment_date,
        appointment_status: r.appointment_status,
        symptom_text: r.symptom_text,
        complaints: r.complaints,
        slot_day: r.slot_day,
        slot_start: r.slot_start,
        slot_end: r.slot_end,
        slot_fee: r.slot_fee,
        doctor_name: `${tryDecrypt(r.doctor_first_name) || ''} ${tryDecrypt(r.doctor_last_name) || ''}`.trim(),
        clinic_name: r.clinic_name,
        has_prescription: r.has_prescription,
      }));

      return res.status(200).json({ appointments });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Patient:Appointments] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listAppointments };
