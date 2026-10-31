const { getDoctorProfileByUsername } = require('../../queries/read/getDoctorByUsername');
const { getClinicProfileByUsername } = require('../../queries/read/getClinicByUsername');
const supabase = require('../../db');

async function publicDoctorProfileHandler(req, res) {
  const { username } = req.params;
  if (!username || typeof username !== 'string' || username.length > 50) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid username' });
  }

  try {
    const doctor = await getDoctorProfileByUsername(username);
    if (!doctor) {
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
    }
    return res.status(200).json({ doctor });
  } catch (err) {
    console.error('[PublicDoctorProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function publicClinicProfileHandler(req, res) {
  const { username } = req.params;
  if (!username || typeof username !== 'string' || username.length > 50) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid username' });
  }

  try {
    const clinic = await getClinicProfileByUsername(username);
    if (!clinic) {
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found' });
    }
    return res.status(200).json({ clinic });
  } catch (err) {
    console.error('[PublicClinicProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function publicDoctorScheduleHandler(req, res) {
  const { username } = req.params;
  if (!username || typeof username !== 'string' || username.length > 50) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid username' });
  }

  try {
    const { data: slots, error } = await supabase
      .from('slots')
      .select(`
        slot_id, slot_day, slot_start, slot_end, slot_fee, booking_fee,
        doctor:doctors!inner(doctor_id, username, first_name, last_name, tag_1, tag_2, tag_3),
        clinic:clinics!inner(clinic_id, username, clinic_name, city)
      `)
      .eq('doctor.username', username)
      .eq('is_deleted', false)
      .order('slot_day');

    if (error) throw error;

    const formatted = (slots || []).map(s => ({
      slot_id: s.slot_id,
      day: s.slot_day,
      start: s.slot_start,
      end: s.slot_end,
      fee: s.slot_fee,
      booking_fee: s.booking_fee,
      clinic: {
        clinic_id: s.clinic.clinic_id,
        username: s.clinic.username,
        name: s.clinic.clinic_name,
        city: s.clinic.city,
      },
    }));

    return res.status(200).json({ slots: formatted });
  } catch (err) {
    console.error('[PublicDoctorSchedule] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { publicDoctorProfileHandler, publicClinicProfileHandler, publicDoctorScheduleHandler };
