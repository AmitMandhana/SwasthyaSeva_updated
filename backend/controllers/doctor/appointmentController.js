const { getAppointmentsByDoctor, getAppointmentsByDoctorRange } = require('../../queries/read/getAppointmentsByDoctor');
const { getPrescription } = require('../../queries/read/getPrescription');
const { getMedications } = require('../../queries/read/getMedications');
const { getExaminationByAppointment } = require('../../queries/read/getExaminationHistory');
const { getTestRequests } = require('../../queries/read/getTestRequests');
const supabase = require('../../db');
const { decrypt } = require('../../utils/pii');

function tryDecrypt(val) {
  if (!val) return '';
  try { return decrypt(val); } catch { return val; }
}

/**
 * GET /api/doctor/appointments/today
 * Returns today's appointment queue for the authenticated doctor.
 */
async function getTodayQueue(req, res) {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const appointments = await getAppointmentsByDoctor({ doctorId: req.doctorId, date });

    console.log(`[Doctor:Queue] OK doctor_id=${req.doctorId} count=${appointments.length}`);
    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('[Doctor:Queue] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/doctor/appointments/:id/full
 * Returns full appointment data including prescription, medications, examination, test requests.
 */
async function getFullAppointment(req, res) {
  const appointmentId = Number(req.params.id);
  if (!appointmentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });
  }

  try {
    // Verify appointment belongs to this doctor
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, user_id, slot_id, symptom_code, symptom_text, complaints, appointment_status, appointment_date, recommended_index')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) {
      return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });
    }

    // Check ownership via slot → doctor
    const { data: slot, error: slotError } = await supabase
      .from('slots')
      .select('doctor_id, clinic_id, slot_start, slot_end')
      .eq('slot_id', appointment.slot_id)
      .maybeSingle();

    if (slotError) throw slotError;
    if (!slot || slot.doctor_id !== req.doctorId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Not your appointment' });
    }

    // Fetch patient info + all related data in parallel
    const [patientResult, symptomResult, prescription, medications, examination, testRequests, clinicResult, doctorResult] = await Promise.all([
      supabase.from('users').select('first_name, last_name, dob, gender, phone, street_address, city, state, occupation, attendant_name, attendant_relationship').eq('user_id', appointment.user_id).maybeSingle(),
      supabase.from('symptoms').select('name').eq('symptom_code', appointment.symptom_code).maybeSingle(),
      getPrescription({ appointmentId }),
      getMedications({ appointmentId }),
      getExaminationByAppointment({ appointmentId }),
      getTestRequests({ appointmentId }),
      supabase.from('clinics').select('clinic_name, street_address, city, state, pincode, phone').eq('clinic_id', slot.clinic_id).maybeSingle(),
      supabase.from('doctors').select('first_name, last_name, base_degree_code, license_no, phone, signature_link').eq('doctor_id', req.doctorId).maybeSingle(),
    ]);

    const patient = patientResult?.data;
    const patientName = patient
      ? `${tryDecrypt(patient.first_name)} ${tryDecrypt(patient.last_name)}`
      : '';
    const symptomName = symptomResult?.data?.name || appointment.symptom_code;

    return res.status(200).json({
      appointment: {
        ...appointment,
        clinic_id: slot.clinic_id,
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        patient_name: patientName,
        dob: patient?.dob,
        gender: patient?.gender,
        symptom_name: symptomName,
        patient_phone: patient?.phone ? tryDecrypt(patient.phone) : null,
        patient_address: patient ? [tryDecrypt(patient.street_address), patient.city, patient.state].filter(Boolean).join(', ') : null,
        patient_city: patient?.city || null,
        patient_occupation: patient?.occupation || null,
        patient_attendant_name: patient?.attendant_name || null,
        patient_attendant_relationship: patient?.attendant_relationship || null,
      },
      prescription,
      medications,
      examination,
      testRequests,
      clinic: clinicResult?.data ? {
        name: clinicResult.data.clinic_name,
        address: [clinicResult.data.street_address, clinicResult.data.city, clinicResult.data.state, clinicResult.data.pincode].filter(Boolean).join(', '),
        phone: clinicResult.data.phone,
      } : null,
      doctor: doctorResult?.data ? {
        name: `Dr. ${doctorResult.data.first_name || ''} ${doctorResult.data.last_name || ''}`.trim(),
        baseDegreeCode: doctorResult.data.base_degree_code,
        licenseNo: doctorResult.data.license_no,
        phone: tryDecrypt(doctorResult.data.phone),
        signatureLink: doctorResult.data.signature_link,
      } : null,
    });
  } catch (err) {
    console.error('[Doctor:FullAppointment] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/doctor/appointments
 * Query params: includePast, dateFrom, dateTo, clinicIds (comma-separated), search
 */
async function getAppointments(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const includePast = req.query.includePast === 'true';

    const dateFrom = req.query.dateFrom || (includePast
      ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : today);
    const dateTo = req.query.dateTo || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const clinicIds = req.query.clinicIds
      ? req.query.clinicIds.split(',').map(Number).filter(Boolean)
      : undefined;

    const search = req.query.search || undefined;

    const appointments = await getAppointmentsByDoctorRange({
      doctorId: req.doctorId,
      dateFrom,
      dateTo,
      clinicIds,
      search,
    });

    console.log(`[Doctor:Appointments] OK doctor_id=${req.doctorId} range=${dateFrom}..${dateTo} count=${appointments.length}`);
    return res.status(200).json({ appointments });
  } catch (err) {
    console.error('[Doctor:Appointments] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function resolveAppointment(req, res) {
  const appointmentId = Number(req.params.id);
  if (!appointmentId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });

  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, slot_id, appointment_status')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) return res.status(404).json({ error: 'Not Found' });

    const { data: slot } = await supabase.from('slots').select('doctor_id').eq('slot_id', appointment.slot_id).maybeSingle();
    if (!slot || slot.doctor_id !== req.doctorId) return res.status(403).json({ error: 'Forbidden' });

    if (appointment.appointment_status === 'completed') {
      return res.status(400).json({ error: 'Bad Request', message: 'Appointment already completed' });
    }

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ appointment_status: 'resolved' })
      .eq('appointment_id', appointmentId);

    if (updateError) throw updateError;

    console.log(`[Doctor:Resolve] appointment_id=${appointmentId} doctor_id=${req.doctorId}`);
    return res.status(200).json({ message: 'Appointment resolved' });
  } catch (err) {
    console.error('[Doctor:Resolve] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function completeAppointment(req, res) {
  const appointmentId = Number(req.params.id);
  if (!appointmentId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid appointment ID' });

  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('appointment_id, slot_id')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    if (!appointment) return res.status(404).json({ error: 'Not Found' });

    const { data: slot } = await supabase.from('slots').select('doctor_id').eq('slot_id', appointment.slot_id).maybeSingle();
    if (!slot || slot.doctor_id !== req.doctorId) return res.status(403).json({ error: 'Forbidden' });

    const { error: updateError } = await supabase
      .from('appointments')
      .update({ appointment_status: 'completed' })
      .eq('appointment_id', appointmentId);

    if (updateError) throw updateError;

    console.log(`[Doctor:Complete] appointment_id=${appointmentId} doctor_id=${req.doctorId}`);
    return res.status(200).json({ message: 'Appointment completed' });
  } catch (err) {
    console.error('[Doctor:Complete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getTodayQueue, getFullAppointment, getAppointments, resolveAppointment, completeAppointment };
