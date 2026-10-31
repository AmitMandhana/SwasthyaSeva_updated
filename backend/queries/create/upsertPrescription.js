const { getPool } = require('../../utils/pool');


/**
 * UPSERT prescription for an appointment.
 * prescription_id = appointment_id (same PK/FK).
 */
async function upsertPrescription({ appointmentId, userId, chiefComplain, significantMedicalHistory, otherFindings, provisionalDiagnosis, finalDiagnosis, prognosis, duration, refills, digitalSignature, prescriptionFormat, surgicalInterventionSuggested, investigationsSuggested, formatData }) {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO prescriptions
         (prescription_id, user_id, chief_complain, significant_medical_history, other_findings, provisional_diagnosis, final_diagnosis, prognosis, duration, refills, digital_signature, prescription_format, surgical_intervention_suggested, investigations_suggested, format_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (prescription_id) DO UPDATE SET
         chief_complain = EXCLUDED.chief_complain,
         significant_medical_history = EXCLUDED.significant_medical_history,
         other_findings = EXCLUDED.other_findings,
         provisional_diagnosis = EXCLUDED.provisional_diagnosis,
         final_diagnosis = EXCLUDED.final_diagnosis,
         prognosis = EXCLUDED.prognosis,
         duration = EXCLUDED.duration,
         refills = EXCLUDED.refills,
         digital_signature = EXCLUDED.digital_signature,
         prescription_format = EXCLUDED.prescription_format,
         surgical_intervention_suggested = EXCLUDED.surgical_intervention_suggested,
         investigations_suggested = EXCLUDED.investigations_suggested,
         format_data = EXCLUDED.format_data
       RETURNING *`,
      [appointmentId, userId, chiefComplain, significantMedicalHistory || null, otherFindings || null, provisionalDiagnosis, finalDiagnosis || null, prognosis || null, duration, refills, digitalSignature || null, prescriptionFormat || 'GEN_MED', surgicalInterventionSuggested || null, investigationsSuggested || null, JSON.stringify(formatData || {})]
    );
    return rows[0];
  } finally {
    client.release();
  }
}

module.exports = { upsertPrescription };
