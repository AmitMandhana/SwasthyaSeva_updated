const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');

function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

async function getDashboard(req, res) {
  const client = await getPool().connect();
  try {
    const userId = req.userId;
    const today = new Date().toISOString().slice(0, 10);

    // Next upcoming appointment
    const { rows: nextApptRows } = await client.query(
      `SELECT a.appointment_id, a.appointment_date, a.appointment_status, a.symptom_text,
              s.slot_day, s.slot_start, s.slot_end,
              d.first_name AS doc_first, d.last_name AS doc_last,
              c.clinic_name
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       JOIN doctors d ON d.doctor_id = s.doctor_id
       JOIN clinics c ON c.clinic_id = s.clinic_id
       WHERE a.user_id = $1 AND a.appointment_date >= $2
         AND a.appointment_status NOT IN ('completed', 'cancelled', 'missed')
       ORDER BY a.appointment_date ASC LIMIT 1`,
      [userId, today]
    );

    let nextAppointment = null;
    if (nextApptRows.length > 0) {
      const r = nextApptRows[0];
      nextAppointment = {
        appointment_id: r.appointment_id,
        date: r.appointment_date,
        status: r.appointment_status,
        doctor_name: `Dr. ${tryDecrypt(r.doc_first)} ${tryDecrypt(r.doc_last)}`.replace(/^(Dr\.?\s*){2,}/i, 'Dr. '),
        clinic_name: r.clinic_name,
        slot_day: r.slot_day,
        slot_start: r.slot_start,
        slot_end: r.slot_end,
        daysUntil: Math.ceil((new Date(r.appointment_date + 'T00:00:00').getTime() - Date.now()) / 86400000),
      };
    }

    // Active medications count (from most recent completed appointment)
    const { rows: medCountRows } = await client.query(
      `SELECT COUNT(*) as count FROM medications m
       JOIN appointments a ON a.appointment_id = m.appointment_id
       WHERE a.user_id = $1 AND a.appointment_status = 'completed'
         AND a.appointment_date = (
           SELECT MAX(a2.appointment_date) FROM appointments a2
           WHERE a2.user_id = $1 AND a2.appointment_status = 'completed'
         )`,
      [userId]
    );

    // Pending lab results
    const { rows: labCountRows } = await client.query(
      `SELECT COUNT(*) as count FROM test_requests tr
       JOIN appointments a ON a.appointment_id = tr.appointment_id
       LEFT JOIN test_reports rpt ON rpt.report_id = tr.request_id
       WHERE a.user_id = $1 AND rpt.report_id IS NULL`,
      [userId]
    );

    // Total visits
    const { rows: visitRows } = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE appointment_status = 'completed') as completed
       FROM appointments WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      nextAppointment,
      activeMedications: Number(medCountRows[0].count),
      pendingLabResults: Number(labCountRows[0].count),
      totalVisits: Number(visitRows[0].total),
      completedVisits: Number(visitRows[0].completed),
    });
  } catch (err) {
    console.error('[Patient:Dashboard] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
}

async function getActiveMedications(req, res) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `SELECT m.medicine_name, m.medication_type, m.amount, m.dosage, m.frequency,
              m.route, m.duration_days, m.special_instructions,
              a.appointment_date
       FROM medications m
       JOIN appointments a ON a.appointment_id = m.appointment_id
       WHERE a.user_id = $1 AND a.appointment_status = 'completed'
         AND a.appointment_date = (
           SELECT MAX(a2.appointment_date) FROM appointments a2
           WHERE a2.user_id = $1 AND a2.appointment_status = 'completed'
         )
       ORDER BY m.medication_id`,
      [req.userId]
    );

    const medications = rows.map(m => {
      const daysSince = Math.floor((Date.now() - new Date(m.appointment_date + 'T00:00:00').getTime()) / 86400000);
      const remaining = Math.max(0, (m.duration_days || 0) - daysSince);
      return {
        ...m,
        days_elapsed: daysSince,
        days_remaining: remaining,
        progress: m.duration_days > 0 ? Math.min(100, Math.round((daysSince / m.duration_days) * 100)) : 0,
      };
    });

    return res.json({ medications });
  } catch (err) {
    console.error('[Patient:ActiveMedications] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
}

module.exports = { getDashboard, getActiveMedications };
