const { getPool } = require('../../utils/pool');
const { upsertPrescription } = require('../../queries/create/upsertPrescription');
const { deletePrescriptionData } = require('../../queries/delete/deletePrescriptionData');
const supabase = require('../../db');


/**
 * POST /api/doctor/prescriptions/save
 * Save/finalize a prescription — upserts prescription, marks appointment completed.
 */
async function savePrescription(req, res) {
  const { appointmentId, chiefComplain, significantMedicalHistory, otherFindings, provisionalDiagnosis, finalDiagnosis, prognosis, duration, refills, surgicalInterventionSuggested, investigationsSuggested, formatData, vitals, medications } = req.body || {};

  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'appointmentId is required' });
  }
  if (!chiefComplain) {
    return res.status(400).json({ error: 'Bad Request', message: 'chiefComplain is required' });
  }
  if (!provisionalDiagnosis) {
    return res.status(400).json({ error: 'Bad Request', message: 'provisionalDiagnosis is required' });
  }
  if (duration == null || duration < 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'duration is required and must be >= 0' });
  }
  if (refills == null || refills < 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'refills is required and must be >= 0' });
  }

  try {
    // Verify ownership
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, user_id, slot_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });
    }

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointment.slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your appointment' });
    }

    // Get doctor's digital signature
    const { data: doctor } = await supabase
      .from('doctors')
      .select('signature_link, prescription_format')
      .eq('doctor_id', req.doctorId)
      .maybeSingle();

    const digitalSignature = doctor?.signature_link || null;
    const prescriptionFormat = doctor?.prescription_format || 'GEN_MED';

    // Upsert prescription
    const prescription = await upsertPrescription({
      appointmentId,
      userId: appointment.user_id,
      chiefComplain,
      significantMedicalHistory: significantMedicalHistory || null,
      otherFindings: otherFindings || null,
      provisionalDiagnosis,
      finalDiagnosis: finalDiagnosis || null,
      prognosis: prognosis || null,
      duration: Number(duration),
      refills: Number(refills),
      digitalSignature,
      prescriptionFormat,
      surgicalInterventionSuggested: surgicalInterventionSuggested || null,
      investigationsSuggested: investigationsSuggested || null,
      formatData: formatData || {},
    });

    const client = await getPool().connect();
    try {
      // Save vitals if provided
      if (vitals && (vitals.height || vitals.weight || vitals.spSystolic || vitals.heartRate || vitals.temperature || vitals.oxygenSaturation)) {
        await client.query(
          `INSERT INTO examination_records (examination_id, user_id, height, weight, sp_systolic, bp_diastolic, heart_rate, respiratory_rate, oxygen_saturation, temperature, waist_circumference)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (examination_id) DO UPDATE SET
             height = EXCLUDED.height, weight = EXCLUDED.weight, sp_systolic = EXCLUDED.sp_systolic,
             bp_diastolic = EXCLUDED.bp_diastolic, heart_rate = EXCLUDED.heart_rate,
             respiratory_rate = EXCLUDED.respiratory_rate, oxygen_saturation = EXCLUDED.oxygen_saturation,
             temperature = EXCLUDED.temperature, waist_circumference = EXCLUDED.waist_circumference`,
          [appointmentId, appointment.user_id,
           vitals.height || null, vitals.weight || null, vitals.spSystolic || null, vitals.bpDiastolic || null,
           vitals.heartRate || null, vitals.respiratoryRate || null, vitals.oxygenSaturation || null,
           vitals.temperature || null, vitals.waistCircumference || null]
        );
      }

      // Sync medications if provided
      if (medications) {
        const keepIds = medications.filter((m) => m.medicationId).map((m) => m.medicationId);
        if (keepIds.length > 0) {
          await client.query(`DELETE FROM medications WHERE appointment_id = $1 AND medication_id != ALL($2::int[])`, [appointmentId, keepIds]);
        } else {
          await client.query(`DELETE FROM medications WHERE appointment_id = $1`, [appointmentId]);
        }
        const existingMeds = medications.filter((m) => m.medicationId && m.medicineName?.trim());
        for (const m of existingMeds) {
          await client.query(
            `UPDATE medications SET medication_type=$1, medicine_name=$2, amount=$3, dosage=$4,
             frequency=$5, route=$6, duration_days=$7, special_instructions=$8, timings=$9, conditional_instructions=$10
             WHERE medication_id=$11 AND appointment_id=$12`,
            [m.medicationType || 'tablet', m.medicineName,
             Number(m.amount) || 0, Number(m.dosage) || 0, Number(m.frequency) || 0, m.route || 'oral',
             Number(m.durationDays) || 0, m.specialInstructions || null,
             m.timings || null, m.conditionalInstructions || null,
             m.medicationId, appointmentId]
          );
        }
        const newMeds = medications.filter((m) => !m.medicationId && m.medicineName?.trim());
        for (const m of newMeds) {
          await client.query(
            `INSERT INTO medications (medication_type, medicine_name, user_id, appointment_id, amount, dosage, frequency, route, duration_days, special_instructions, timings, conditional_instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [m.medicationType || 'tablet', m.medicineName, appointment.user_id, appointmentId,
             Number(m.amount) || 0, Number(m.dosage) || 0, Number(m.frequency) || 0, m.route || 'oral',
             Number(m.durationDays) || 0, m.specialInstructions || null,
             m.timings || null, m.conditionalInstructions || null]
          );
        }
      }
    } finally {
      client.release();
    }

    console.log(`[Doctor:Prescription] SAVED appointment_id=${appointmentId} doctor_id=${req.doctorId}`);
    return res.status(200).json({ prescription });
  } catch (err) {
    console.error('[Doctor:Prescription] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/doctor/prescriptions/:id/all
 * Reset/clear all prescription data for an appointment.
 */
async function resetPrescription(req, res) {
  const appointmentId = Number(req.params.id);
  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });
  }

  try {
    // Verify ownership
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, slot_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });
    }

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointment.slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your appointment' });
    }

    await deletePrescriptionData({ appointmentId });

    // Revert appointment status
    const client = await getPool().connect();
    try {
      await client.query(
        `UPDATE appointments SET appointment_status = 'in_progress' WHERE appointment_id = $1`,
        [appointmentId]
      );
    } finally {
      client.release();
    }

    console.log(`[Doctor:Prescription] RESET appointment_id=${appointmentId} doctor_id=${req.doctorId}`);
    return res.status(200).json({ message: 'Prescription data cleared' });
  } catch (err) {
    console.error('[Doctor:Prescription:Reset] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { savePrescription, resetPrescription };
