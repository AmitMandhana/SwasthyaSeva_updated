const { getPool } = require('../../utils/pool');
const { decrypt } = require('../../utils/pii');


function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * GET /api/patient/prescriptions
 * List all prescriptions for the authenticated patient.
 */
async function listPrescriptions(req, res) {
  try {
    const client = await getPool().connect();
    try {
      const { rows } = await client.query(
        `SELECT
           p.prescription_id AS appointment_id,
           p.chief_complain,
           a.appointment_date,
           a.appointment_status,
           d.first_name AS doctor_first_name,
           d.last_name AS doctor_last_name,
           c.clinic_name
         FROM prescriptions p
         JOIN appointments a ON a.appointment_id = p.prescription_id
         JOIN slots s ON s.slot_id = a.slot_id
         JOIN doctors d ON d.doctor_id = s.doctor_id
         JOIN clinics c ON c.clinic_id = s.clinic_id
         WHERE p.user_id = $1
         ORDER BY a.appointment_date DESC`,
        [req.userId]
      );

      const prescriptions = rows.map(r => ({
        appointmentId: r.appointment_id,
        date: r.appointment_date,
        status: r.appointment_status,
        doctorName: `Dr. ${r.doctor_first_name || ''} ${r.doctor_last_name || ''}`.trim(),
        clinicName: r.clinic_name,
        chiefComplain: r.chief_complain,
      }));

      return res.status(200).json({ prescriptions, total: prescriptions.length });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Patient:Prescriptions] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/patient/prescriptions/:appointmentId
 * Full prescription detail for the authenticated patient.
 */
async function getPrescriptionDetail(req, res) {
  const appointmentId = Number(req.params.appointmentId);
  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });
  }

  try {
    const client = await getPool().connect();
    try {
      // Fetch prescription with ownership check
      const { rows: prescRows } = await client.query(
        `SELECT p.*, a.appointment_date, a.appointment_status, a.symptom_text, a.complaints,
                s.slot_id, s.clinic_id, s.doctor_id, s.watermark_url, s.slot_start, s.slot_end,
                d.first_name AS doctor_first_name, d.last_name AS doctor_last_name,
                d.license_no, d.signature_link, d.base_degree_code, d.phone AS doctor_phone,
                c.clinic_name, c.street_address AS clinic_address, c.phone AS clinic_phone, c.city AS clinic_city, c.state AS clinic_state, c.pincode AS clinic_pincode,
                u.first_name AS patient_first_name, u.last_name AS patient_last_name, u.dob AS patient_dob, u.gender AS patient_gender, u.phone AS patient_phone, u.street_address AS patient_address, u.city AS patient_city, u.occupation AS patient_occupation, u.attendant_name, u.attendant_relationship
         FROM prescriptions p
         JOIN appointments a ON a.appointment_id = p.prescription_id
         JOIN slots s ON s.slot_id = a.slot_id
         JOIN doctors d ON d.doctor_id = s.doctor_id
         JOIN clinics c ON c.clinic_id = s.clinic_id
         JOIN users u ON u.user_id = p.user_id
         WHERE p.prescription_id = $1`,
        [appointmentId]
      );

      if (prescRows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Prescription not found' });
      }

      const presc = prescRows[0];
      if (presc.user_id !== req.userId) {
        return res.status(403).json({ error: 'Forbidden', message: 'Not your prescription' });
      }

      // Fetch related data in parallel
      const [medRows, examRows, testRows] = await Promise.all([
        client.query('SELECT * FROM medications WHERE appointment_id = $1 ORDER BY medication_id', [appointmentId]),
        client.query('SELECT * FROM examination_records WHERE examination_id = $1', [appointmentId]),
        client.query(
          `SELECT tr.request_id, tr.test_name,
                  rpt.report_id, rpt.test_report_link, rpt.test_date
           FROM test_requests tr
           LEFT JOIN test_reports rpt ON rpt.report_id = tr.request_id
           WHERE tr.appointment_id = $1
           ORDER BY tr.request_id`,
          [appointmentId]
        ),
      ]);

      return res.status(200).json({
        prescriptionFormat: presc.prescription_format || 'GEN_MED',
        prescription: {
          chiefComplain: presc.chief_complain,
          significantMedicalHistory: presc.significant_medical_history,
          otherFindings: presc.other_findings,
          provisionalDiagnosis: presc.provisional_diagnosis,
          finalDiagnosis: presc.final_diagnosis,
          prognosis: presc.prognosis,
          duration: presc.duration,
          refills: presc.refills,
          digitalSignature: presc.digital_signature,
          surgicalInterventionSuggested: presc.surgical_intervention_suggested,
          investigationsSuggested: presc.investigations_suggested,
          formatData: presc.format_data || {},
        },
        appointment: {
          appointmentId: presc.prescription_id,
          date: presc.appointment_date,
          status: presc.appointment_status,
          symptomText: presc.symptom_text,
          complaints: presc.complaints,
          slotStart: presc.slot_start,
          slotEnd: presc.slot_end,
        },
        doctor: {
          name: `Dr. ${presc.doctor_first_name || ''} ${presc.doctor_last_name || ''}`.trim(),
          licenseNo: presc.license_no,
          signatureLink: presc.signature_link,
          baseDegreeCode: presc.base_degree_code,
          phone: tryDecrypt(presc.doctor_phone),
        },
        clinic: {
          name: presc.clinic_name,
          address: [presc.clinic_address, presc.clinic_city, presc.clinic_state, presc.clinic_pincode].filter(Boolean).join(', '),
          phone: presc.clinic_phone,
        },
        patient: {
          name: `${tryDecrypt(presc.patient_first_name) || ''} ${tryDecrypt(presc.patient_last_name) || ''}`.trim(),
          dob: presc.patient_dob,
          gender: presc.patient_gender,
          phone: tryDecrypt(presc.patient_phone),
          address: presc.patient_address ? tryDecrypt(presc.patient_address) : null,
          city: presc.patient_city,
          occupation: presc.patient_occupation,
          attendantName: presc.attendant_name,
          attendantRelationship: presc.attendant_relationship,
        },
        watermarkUrl: presc.watermark_url || null,
        medications: medRows.rows,
        examination: examRows.rows[0] || null,
        testRequests: testRows.rows,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Patient:PrescriptionDetail] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listPrescriptions, getPrescriptionDetail };
