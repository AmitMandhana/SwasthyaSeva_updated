const { Router } = require('express');
const { getPool } = require('../utils/pool');
const { doctorLogin, doctorVerifyLoginOTP, doctorResendLoginOTP } = require('../controllers/doctor/authController');
const { requireDoctor } = require('../middleware/doctorAuth');
const { getTodayQueue, getFullAppointment, getAppointments, resolveAppointment, completeAppointment } = require('../controllers/doctor/appointmentController');
const { saveExamination, getVitalsHistory } = require('../controllers/doctor/examinationController');
const { savePrescription, resetPrescription } = require('../controllers/doctor/prescriptionController');
const { addMedication, removeMedication, listMedicines } = require('../controllers/doctor/medicationController');
const { addTestRequest, removeTestRequest, getPatientTestResults } = require('../controllers/doctor/testController');
const { getProfile, updateProfile } = require('../controllers/doctor/profileController');
const { getCloudinarySignatureHandler } = require('../controllers/admin/cloudinaryController');
const { getSlots } = require('../queries/read/getSlots');
const { e2eSelfGuard } = require('../middleware/e2eGuard');

const router = Router();

// POST /api/doctor/login
router.post('/login',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Doctor login'
     #swagger.description = 'Authenticate a doctor with username and password'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $username: 'dr_smith', $password: 'password123' } }
     #swagger.responses[200] = { description: 'Login successful', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid credentials' }
  */
  doctorLogin);

// POST /api/doctor/verify-login-otp
router.post('/verify-login-otp',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Verify login OTP'
     #swagger.description = 'Complete 2FA login by verifying OTP sent to doctor phone'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $loginId: 'doctor_1_abc123', $otp: '123456' } }
     #swagger.responses[200] = { description: 'OTP verified', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid OTP' }
  */
  doctorVerifyLoginOTP);

// POST /api/doctor/resend-login-otp
router.post('/resend-login-otp',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Resend login OTP'
     #swagger.description = 'Resend OTP for doctor 2FA login'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $loginId: 'doctor_1_abc123' } }
     #swagger.responses[200] = { description: 'OTP resent' }
     #swagger.responses[429] = { description: 'Cooldown active' }
  */
  doctorResendLoginOTP);

// --- Protected routes ---
router.use(requireDoctor);

// Block Playwright from mutating non-e2e doctor accounts (no-op outside DEV_MODE)
const selfGuard = e2eSelfGuard();
router.use((req, res, next) => {
  if (req.method === 'GET') return next();
  return selfGuard(req, res, next);
});

// Profile
router.get('/profile',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get doctor profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Doctor profile data' }
  */
  getProfile);
router.patch('/profile',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Update doctor profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { bio: 'Updated bio' } }
     #swagger.responses[200] = { description: 'Profile updated' }
  */
  updateProfile);

// Cloudinary upload signature
router.get('/cloudinary-signature',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get Cloudinary upload signature'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Upload signature' }
  */
  getCloudinarySignatureHandler);

// Dashboard summary
router.get('/dashboard-summary', async (req, res) => {
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get dashboard summary'
     #swagger.description = 'Returns today slots, unresolved count, and today stats'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Dashboard summary', schema: { todaySlots: [], unresolvedCount: 0, todayStats: { total: 0, completed: 0, accepted: 0, pending: 0 } } }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  try {
    
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);

    // Today's slots with clinic info + patient counts
    const { rows: todaySlots } = await pool.query(
      `SELECT s.slot_id, s.slot_day, s.slot_start, s.slot_end, s.slot_fee,
              c.clinic_id, c.clinic_name,
              COUNT(a.appointment_id) FILTER (WHERE a.appointment_date = $2) AS patient_count
       FROM slots s
       JOIN clinics c ON c.clinic_id = s.clinic_id
       LEFT JOIN appointments a ON a.slot_id = s.slot_id AND a.appointment_date = $2
       WHERE s.doctor_id = $1 AND s.is_deleted = false
       GROUP BY s.slot_id, c.clinic_id, c.clinic_name
       ORDER BY s.slot_start`,
      [req.doctorId, today]
    );

    // Unresolved count (past appointments that are accepted/waiting/in_progress with no prescription)
    const { rows: unresolvedRows } = await pool.query(
      `SELECT COUNT(*) as count
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       LEFT JOIN prescriptions p ON p.prescription_id = a.appointment_id
       WHERE s.doctor_id = $1
         AND a.appointment_date < $2
         AND a.appointment_status IN ('accepted', 'waiting', 'in_progress')
         AND p.prescription_id IS NULL`,
      [req.doctorId, today]
    );

    // Today's stats
    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE appointment_status = 'completed') as completed,
         COUNT(*) FILTER (WHERE appointment_status = 'accepted') as accepted,
         COUNT(*) FILTER (WHERE appointment_status = 'pending') as pending
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       WHERE s.doctor_id = $1 AND a.appointment_date = $2`,
      [req.doctorId, today]
    );

    // Week slots: for each day Mon-Sun, compute the date and count patients
    const DAY_MAP = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
    const todayDate = new Date(today + 'T00:00:00');
    const todayDow = todayDate.getDay();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - ((todayDow + 6) % 7)); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const { rows: weekSlotRows } = await pool.query(
      `SELECT s.slot_id, s.slot_day, s.slot_start, s.slot_end, s.slot_fee,
              c.clinic_id, c.clinic_name,
              COUNT(a.appointment_id) AS patient_count
       FROM slots s
       JOIN clinics c ON c.clinic_id = s.clinic_id
       LEFT JOIN appointments a ON a.slot_id = s.slot_id AND a.appointment_date BETWEEN $2 AND $3
       WHERE s.doctor_id = $1 AND s.is_deleted = false
       GROUP BY s.slot_id, c.clinic_id, c.clinic_name
       ORDER BY s.slot_start`,
      [req.doctorId, weekStartStr, weekEndStr]
    );

    const weekSlots = {};
    for (const s of weekSlotRows) {
      if (!weekSlots[s.slot_day]) weekSlots[s.slot_day] = [];
      weekSlots[s.slot_day].push({ ...s, patient_count: Number(s.patient_count) });
    }

    // First-time vs follow-up patients today
    const { rows: visitTypeRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM appointments a2 JOIN slots s2 ON s2.slot_id = a2.slot_id
           WHERE s2.doctor_id = $1 AND a2.user_id = a.user_id AND a2.appointment_date < $2
         )) AS first_time,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM appointments a2 JOIN slots s2 ON s2.slot_id = a2.slot_id
           WHERE s2.doctor_id = $1 AND a2.user_id = a.user_id AND a2.appointment_date < $2
         )) AS follow_up
       FROM appointments a
       JOIN slots s ON s.slot_id = a.slot_id
       WHERE s.doctor_id = $1 AND a.appointment_date = $2`,
      [req.doctorId, today]
    );

    // Growth: this week vs last week
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const growthQuery = `
      SELECT COUNT(*) AS appointments,
             COUNT(DISTINCT a.user_id) AS unique_patients,
             COUNT(*) FILTER (WHERE a.appointment_status = 'completed') AS completed
      FROM appointments a JOIN slots s ON s.slot_id = a.slot_id
      WHERE s.doctor_id = $1 AND a.appointment_date BETWEEN $2 AND $3`;

    const [{ rows: thisWeekRows }, { rows: lastWeekRows }] = await Promise.all([
      pool.query(growthQuery, [req.doctorId, weekStartStr, weekEndStr]),
      pool.query(growthQuery, [req.doctorId, lastWeekStart.toISOString().slice(0, 10), lastWeekEnd.toISOString().slice(0, 10)]),
    ]);

    return res.json({
      todaySlots: todaySlots.map(s => ({
        ...s,
        patient_count: Number(s.patient_count),
      })),
      unresolvedCount: Number(unresolvedRows[0].count),
      todayStats: {
        total: Number(statsRows[0].total),
        completed: Number(statsRows[0].completed),
        accepted: Number(statsRows[0].accepted),
        pending: Number(statsRows[0].pending),
      },
      weekSlots,
      visitTypes: {
        firstTime: Number(visitTypeRows[0].first_time),
        followUp: Number(visitTypeRows[0].follow_up),
      },
      growth: {
        thisWeek: { appointments: Number(thisWeekRows[0].appointments), uniquePatients: Number(thisWeekRows[0].unique_patients), completed: Number(thisWeekRows[0].completed) },
        lastWeek: { appointments: Number(lastWeekRows[0].appointments), uniquePatients: Number(lastWeekRows[0].unique_patients), completed: Number(lastWeekRows[0].completed) },
      },
    });
  } catch (err) {
    console.error('[Doctor:Dashboard]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Doctor's own slots
router.get('/slots', async (req, res) => {
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'List doctor slots'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot list', schema: { slots: [] } }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  try {
    const slots = await getSlots({ doctor_id: req.doctorId });
    return res.json({ slots });
  } catch (err) {
    console.error('[Doctor:Slots]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Doctor's clinics (all clinics they've ever had slots in)
router.get('/clinics', async (req, res) => {
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'List doctor clinics'
     #swagger.description = 'All clinics the doctor has ever had slots in'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Clinic list', schema: { clinics: [] } }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  try {
    const slots = await getSlots({ doctor_id: req.doctorId, includeDeleted: true });
    const clinicMap = new Map();
    for (const s of slots) {
      if (!clinicMap.has(s.clinic_id)) {
        clinicMap.set(s.clinic_id, { clinic_id: s.clinic_id, clinic_name: s.clinic_name });
      }
    }
    return res.json({ clinics: Array.from(clinicMap.values()) });
  } catch (err) {
    console.error('[Doctor:Clinics]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Patient prescription history
router.get('/patients/:userId/prescription-history', async (req, res) => {
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get patient prescription history'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['userId'] = { in: 'path', required: true, type: 'integer', description: 'Patient user ID' }
     #swagger.responses[200] = { description: 'Prescription history', schema: { history: [] } }
     #swagger.responses[400] = { description: 'Invalid userId' }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid userId' });
  try {
    
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT p.*, a.appointment_date, a.symptom_text, a.complaints,
              s.slot_id, s.clinic_id,
              d.doctor_id, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name, d.username AS doctor_username,
              c.clinic_name, c.username AS clinic_username,
              json_agg(json_build_object(
                'medicine_name', m.medicine_name, 'amount', m.amount,
                'frequency', m.frequency, 'duration_days', m.duration_days,
                'special_instructions', m.special_instructions
              )) FILTER (WHERE m.medication_id IS NOT NULL) AS medications
       FROM prescriptions p
       JOIN appointments a ON a.appointment_id = p.prescription_id
       JOIN slots s ON s.slot_id = a.slot_id
       JOIN doctors d ON d.doctor_id = s.doctor_id
       JOIN clinics c ON c.clinic_id = s.clinic_id
       LEFT JOIN medications m ON m.appointment_id = a.appointment_id
       WHERE p.user_id = $1
       GROUP BY p.prescription_id, a.appointment_date, a.symptom_text, a.complaints,
                s.slot_id, s.clinic_id, d.doctor_id, d.first_name, d.last_name, d.username, c.clinic_name, c.username
       ORDER BY a.appointment_date DESC
       LIMIT 10`,
      [userId]
    );
    
    return res.json({ history: rows });
  } catch (err) {
    console.error('[Doctor:PrescriptionHistory]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Patients list
router.get('/patients', async (req, res) => {
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'List doctor patients'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['search'] = { in: 'query', type: 'string', description: 'Search by patient name' }
     #swagger.responses[200] = { description: 'Patient list', schema: { patients: [] } }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  try {
    
    const { decrypt } = require('../utils/pii');
    function tryDec(v) { try { return v ? decrypt(v) : ''; } catch { return v || ''; } }
    const pool = getPool();
    const search = req.query.search || '';

    const { rows } = await pool.query(
      `SELECT u.user_id, u.first_name, u.last_name, u.gender, u.dob,
              MAX(a.appointment_date) as last_visit,
              COUNT(a.appointment_id) as total_visits
       FROM users u
       JOIN appointments a ON a.user_id = u.user_id
       JOIN slots s ON s.slot_id = a.slot_id
       WHERE s.doctor_id = $1
       GROUP BY u.user_id
       ORDER BY MAX(a.appointment_date) DESC
       LIMIT 100`,
      [req.doctorId]
    );

    

    let patients = rows.map(r => ({
      user_id: r.user_id,
      patient_name: `${tryDec(r.first_name)} ${tryDec(r.last_name)}`.trim(),
      gender: r.gender,
      dob: r.dob,
      last_visit: r.last_visit,
      total_visits: Number(r.total_visits),
    }));

    if (search) {
      const q = search.toLowerCase();
      patients = patients.filter(p => p.patient_name.toLowerCase().includes(q));
    }

    return res.json({ patients });
  } catch (err) {
    console.error('[Doctor:Patients]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Appointment queue
router.get('/appointments',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'List appointments'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Appointment list' }
  */
  getAppointments);
router.get('/appointments/today',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get today appointment queue'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Today queue' }
  */
  getTodayQueue);
router.get('/appointments/:id/full',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get full appointment details'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Appointment ID' }
     #swagger.responses[200] = { description: 'Full appointment details' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getFullAppointment);
router.patch('/appointments/:id/resolve',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Resolve an appointment'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Appointment ID' }
     #swagger.responses[200] = { description: 'Appointment resolved' }
  */
  resolveAppointment);
router.patch('/appointments/:id/complete',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Complete an appointment'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Appointment ID' }
     #swagger.responses[200] = { description: 'Appointment completed' }
  */
  completeAppointment);

// Examination (vitals)
router.post('/examination',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Save examination / vitals'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $appointment_id: 1, blood_pressure: '120/80', pulse: 72, temperature: 98.6, weight: 70 } }
     #swagger.responses[200] = { description: 'Examination saved' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  saveExamination);
router.get('/patients/:userId/vitals-history',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get patient vitals history'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['userId'] = { in: 'path', required: true, type: 'integer', description: 'Patient user ID' }
     #swagger.responses[200] = { description: 'Vitals history' }
  */
  getVitalsHistory);

// Prescriptions
router.post('/prescriptions/save',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Save a prescription'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $appointment_id: 1, diagnosis: 'Common cold', notes: 'Rest recommended' } }
     #swagger.responses[200] = { description: 'Prescription saved' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  savePrescription);
router.delete('/prescriptions/:id/all',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Reset / delete a prescription'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Prescription ID' }
     #swagger.responses[200] = { description: 'Prescription reset' }
  */
  resetPrescription);

// Medications
router.post('/medications',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Add a medication to prescription'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $appointment_id: 1, $medicine_name: 'Paracetamol', amount: '500mg', frequency: 'twice daily', duration_days: 5 } }
     #swagger.responses[201] = { description: 'Medication added' }
  */
  addMedication);
router.delete('/medications/:id',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Remove a medication'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Medication ID' }
     #swagger.responses[200] = { description: 'Medication removed' }
  */
  removeMedication);
router.get('/medicines',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'List available medicines'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Medicine list' }
  */
  listMedicines);

// Lab tests
router.post('/test-requests',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Add a lab test request'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $appointment_id: 1, $test_name: 'CBC', notes: 'Fasting required' } }
     #swagger.responses[201] = { description: 'Test request added' }
  */
  addTestRequest);
router.delete('/test-requests/:id',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Remove a lab test request'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', description: 'Test request ID' }
     #swagger.responses[200] = { description: 'Test request removed' }
  */
  removeTestRequest);
router.get('/patients/:userId/test-results',
  /* #swagger.tags = ['Doctor']
     #swagger.summary = 'Get patient test results'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['userId'] = { in: 'path', required: true, type: 'integer', description: 'Patient user ID' }
     #swagger.responses[200] = { description: 'Test results' }
  */
  getPatientTestResults);

module.exports = router;
