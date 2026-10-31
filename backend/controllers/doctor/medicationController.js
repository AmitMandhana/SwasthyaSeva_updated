const { createMedication, VALID_MEDICATION_TYPES, VALID_ROUTES } = require('../../queries/create/createMedication');
const { deleteMedication } = require('../../queries/delete/deleteMedication');
const { getMedicinesList } = require('../../queries/read/getMedications');
const supabase = require('../../db');

/**
 * POST /api/doctor/medications
 * Add a medication to an appointment's prescription.
 */
async function addMedication(req, res) {
  const { appointmentId, medicationType, medicineName, medicineId, amount, dosage, frequency, route, durationDays, specialInstructions } = req.body || {};

  if (!appointmentId || !medicineName || !medicationType || !route) {
    return res.status(400).json({ error: 'Bad Request', message: 'appointmentId, medicineName, medicationType, and route are required' });
  }
  if (!VALID_MEDICATION_TYPES.includes(medicationType)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid medication_type. Valid: ${VALID_MEDICATION_TYPES.join(', ')}` });
  }
  if (!VALID_ROUTES.includes(route)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid route. Valid: ${VALID_ROUTES.join(', ')}` });
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

    const medication = await createMedication({
      medicationType,
      medicineName,
      userId: appointment.user_id,
      appointmentId,
      medicineId: medicineId || null,
      amount: Number(amount) || 0,
      dosage: Number(dosage) || 0,
      frequency: Number(frequency) || 0,
      route,
      durationDays: Number(durationDays) || 0,
      specialInstructions: specialInstructions || null,
    });

    console.log(`[Doctor:Medication] ADDED medication_id=${medication.medication_id} appointment_id=${appointmentId}`);
    return res.status(201).json({ medication });
  } catch (err) {
    console.error('[Doctor:Medication:Add] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/doctor/medications/:id
 * Remove a medication.
 */
async function removeMedication(req, res) {
  const medicationId = Number(req.params.id);
  if (!medicationId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid medication ID' });
  }

  try {
    // First get the medication to find the appointment
    const { data: med, error: medError } = await supabase
      .from('medications')
      .select('medication_id, appointment_id')
      .eq('medication_id', medicationId)
      .maybeSingle();

    if (medError) throw medError;
    if (!med) {
      return res.status(404).json({ error: 'Not Found', message: 'Medication not found' });
    }

    // Verify ownership chain: medication → appointment → slot → doctor
    const { data: appointment } = await supabase
      .from('appointments')
      .select('slot_id')
      .eq('appointment_id', med.appointment_id)
      .maybeSingle();

    const { data: slot } = await supabase
      .from('slots')
      .select('doctor_id')
      .eq('slot_id', appointment?.slot_id)
      .maybeSingle();

    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your medication' });
    }

    await deleteMedication({ medicationId });
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('[Doctor:Medication:Remove] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/doctor/medicines
 * Returns the medicines master table.
 */
async function listMedicines(req, res) {
  try {
    const medicines = await getMedicinesList();
    return res.status(200).json({ medicines });
  } catch (err) {
    console.error('[Doctor:Medicines] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { addMedication, removeMedication, listMedicines };
