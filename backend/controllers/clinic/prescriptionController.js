const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');


function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * GET /api/clinic/prescriptions
 * Paginated list of prescriptions scoped to this clinic — METADATA ONLY.
 */
async function listClinicPrescriptions(req, res) {
  const { dateFrom, dateTo, doctorId, limit = 20, offset = 0 } = req.query;

  try {
    const client = await getPool().connect();
    try {
      const conditions = ['s.clinic_id = $1'];
      const params = [req.clinicId];
      let paramIdx = 2;

      if (dateFrom) {
        conditions.push(`a.appointment_date >= $${paramIdx++}`);
        params.push(dateFrom);
      }
      if (dateTo) {
        conditions.push(`a.appointment_date <= $${paramIdx++}`);
        params.push(dateTo);
      }
      if (doctorId) {
        conditions.push(`s.doctor_id = $${paramIdx++}`);
        params.push(Number(doctorId));
      }

      const whereClause = conditions.join(' AND ');

      // Count query
      const countParams = [...params];
      const { rows: countRows } = await client.query(
        `SELECT COUNT(*) AS total
         FROM prescriptions p
         JOIN appointments a ON a.appointment_id = p.prescription_id
         JOIN slots s ON s.slot_id = a.slot_id
         WHERE ${whereClause}`,
        countParams
      );

      // Data query
      const dataParams = [...params, Number(limit), Number(offset)];
      const { rows } = await client.query(
        `SELECT
           p.prescription_id AS appointment_id,
           p.chief_complain,
           a.appointment_date,
           a.appointment_status,
           u.first_name AS patient_first_name,
           u.last_name AS patient_last_name,
           d.first_name AS doctor_first_name,
           d.last_name AS doctor_last_name
         FROM prescriptions p
         JOIN appointments a ON a.appointment_id = p.prescription_id
         JOIN slots s ON s.slot_id = a.slot_id
         JOIN users u ON u.user_id = p.user_id
         JOIN doctors d ON d.doctor_id = s.doctor_id
         WHERE ${whereClause}
         ORDER BY a.appointment_date DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        dataParams
      );

      const prescriptions = rows.map(r => ({
        appointmentId: r.appointment_id,
        date: r.appointment_date,
        status: r.appointment_status,
        patientName: `${tryDecrypt(r.patient_first_name) || ''} ${tryDecrypt(r.patient_last_name) || ''}`.trim(),
        doctorName: `Dr. ${r.doctor_first_name || ''} ${r.doctor_last_name || ''}`.trim(),
        chiefComplain: r.chief_complain,
      }));

      return res.status(200).json({
        prescriptions,
        total: parseInt(countRows[0].total, 10),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Clinic:Prescriptions] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/clinic/prescriptions/:appointmentId
 * Prescription metadata detail — NO sensitive medical data.
 */
async function getClinicPrescriptionDetail(req, res) {
  const appointmentId = Number(req.params.appointmentId);
  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });
  }

  try {
    const client = await getPool().connect();
    try {
      const { rows } = await client.query(
        `SELECT
           p.prescription_id AS appointment_id,
           p.chief_complain,
           p.final_diagnosis,
           a.appointment_date,
           a.appointment_status,
           u.first_name AS patient_first_name,
           u.last_name AS patient_last_name,
           d.first_name AS doctor_first_name,
           d.last_name AS doctor_last_name,
           s.clinic_id
         FROM prescriptions p
         JOIN appointments a ON a.appointment_id = p.prescription_id
         JOIN slots s ON s.slot_id = a.slot_id
         JOIN users u ON u.user_id = p.user_id
         JOIN doctors d ON d.doctor_id = s.doctor_id
         WHERE p.prescription_id = $1`,
        [appointmentId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Prescription not found' });
      }

      const row = rows[0];
      if (row.clinic_id !== req.clinicId) {
        return res.status(403).json({ error: 'Forbidden', message: 'Not your clinic\'s prescription' });
      }

      // Get counts only — NOT details
      const [medCount, testCount] = await Promise.all([
        client.query('SELECT COUNT(*) AS count FROM medications WHERE appointment_id = $1', [appointmentId]),
        client.query('SELECT COUNT(*) AS count FROM test_requests WHERE appointment_id = $1', [appointmentId]),
      ]);

      return res.status(200).json({
        appointmentId: row.appointment_id,
        date: row.appointment_date,
        status: row.appointment_status,
        patientName: `${tryDecrypt(row.patient_first_name) || ''} ${tryDecrypt(row.patient_last_name) || ''}`.trim(),
        doctorName: `Dr. ${row.doctor_first_name || ''} ${row.doctor_last_name || ''}`.trim(),
        chiefComplain: row.chief_complain,
        finalDiagnosis: row.final_diagnosis,
        medicationCount: parseInt(medCount.rows[0].count, 10),
        testRequestCount: parseInt(testCount.rows[0].count, 10),
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Clinic:PrescriptionDetail] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listClinicPrescriptions, getClinicPrescriptionDetail };
