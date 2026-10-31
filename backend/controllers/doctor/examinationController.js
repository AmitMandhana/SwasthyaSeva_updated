const { upsertExamination } = require('../../queries/create/upsertExamination');
const { getExaminationHistory } = require('../../queries/read/getExaminationHistory');
const supabase = require('../../db');

/**
 * POST /api/doctor/examination
 * Upsert examination record (vitals) for an appointment.
 */
async function saveExamination(req, res) {
  const { appointmentId, height, weight, spSystolic, bpDiastolic, heartRate, respiratoryRate, oxygenSaturation, bloodSugar, temperature, waistCircumference } = req.body || {};

  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'appointmentId is required' });
  }

  try {
    // Verify appointment ownership
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

    const examination = await upsertExamination({
      appointmentId,
      userId: appointment.user_id,
      height: height || null,
      weight: weight || null,
      spSystolic: spSystolic || null,
      bpDiastolic: bpDiastolic || null,
      heartRate: heartRate || null,
      respiratoryRate: respiratoryRate || null,
      oxygenSaturation: oxygenSaturation || null,
      bloodSugar: bloodSugar || null,
      temperature: temperature || null,
      waistCircumference: waistCircumference || null,
    });

    console.log(`[Doctor:Examination] SAVED appointment_id=${appointmentId} doctor_id=${req.doctorId}`);
    return res.status(200).json({ examination });
  } catch (err) {
    console.error('[Doctor:Examination] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/doctor/patients/:userId/vitals-history
 * Returns all examination records for a patient.
 */
async function getVitalsHistory(req, res) {
  const userId = Number(req.params.userId);
  if (!userId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid userId' });
  }

  try {
    // Verify doctor-patient relationship (at least one appointment)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('appointment_id, slot_id')
      .eq('user_id', userId)
      .limit(1);

    if (error) throw error;

    const hasRelationship = appointments && appointments.length > 0;
    if (hasRelationship) {
      const { data: slot } = await supabase
        .from('slots')
        .select('doctor_id')
        .eq('slot_id', appointments[0].slot_id)
        .maybeSingle();

      if (!slot || slot.doctor_id !== req.doctorId) {
        return res.status(403).json({ error: 'Forbidden', message: 'No doctor-patient relationship' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden', message: 'No doctor-patient relationship' });
    }

    const history = await getExaminationHistory({ userId });
    return res.status(200).json({ history });
  } catch (err) {
    console.error('[Doctor:VitalsHistory] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { saveExamination, getVitalsHistory };
