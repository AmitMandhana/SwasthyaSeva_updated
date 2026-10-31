const { Router } = require('express');
const { clinicAdminLogin, clinicAdminVerifyLoginOTP, clinicAdminResendLoginOTP } = require('../controllers/clinic/authController');
const { e2eGuard } = require('../middleware/e2eGuard');
const { clinicLogin, clinicVerifyLoginOTP, clinicResendLoginOTP } = require('../controllers/clinic/clinicLoginController');
const { requireClinicAuth, requireClinicOnly } = require('../middleware/clinicAuth');
const { clinicAuditLog } = require('../middleware/clinicAuditLog');
const { getProfile, updateProfile } = require('../controllers/clinic/profileController');
const { listAppointments, appointmentStats } = require('../controllers/clinic/appointmentController');
const { listClinicAdmins, createClinicAdmin, updateClinicAdmin, deleteClinicAdmin, restoreClinicAdmin } = require('../controllers/clinic/clinicAdminController');
const { listClinicAuditLogs } = require('../controllers/clinic/auditLogController');
const { appointmentTrends, revenueSummary, slotUtilization, topDoctors } = require('../controllers/clinic/analyticsController');
const { listLeads, createLead, updateLead } = require('../controllers/clinic/leadController');
const { listClinicSlots, listSymptoms, listComplaints } = require('../controllers/clinic/lookupController');
const { lookupPatient, sendBookingOTP, verifyBookingOTP, registerBookingPatient, createBookingAppointment } = require('../controllers/clinic/bookingController');
const { bookingLookupLimit, bookingOTPSendLimit, bookingOTPVerifyLimit } = require('../ratelimits/booking');
const { listClinicPrescriptions, getClinicPrescriptionDetail } = require('../controllers/clinic/prescriptionController');
const { createClinicSlot, updateClinicSlot, deleteClinicSlot, restoreClinicSlot } = require('../controllers/clinic/slotController');
const { getCloudinarySignatureHandler } = require('../controllers/admin/cloudinaryController');

const router = Router();

// ── Public (unauthenticated) ──

// POST /api/clinic/login — clinic admin login (username + password)
router.post('/login',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Clinic admin login'
     #swagger.description = 'Authenticate a clinic admin with username and password'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $username: 'clinic_admin', $password: 'password123' } }
     #swagger.responses[200] = { description: 'Login successful', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid credentials' }
  */
  clinicAdminLogin);

// POST /api/clinic/clinic-login — clinic entity login (phone + password)
router.post('/clinic-login',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Clinic entity login'
     #swagger.description = 'Authenticate a clinic entity with phone and password'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $phone: '9876543210', $password: 'password123' } }
     #swagger.responses[200] = { description: 'Login successful', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid credentials' }
  */
  clinicLogin);

// POST /api/clinic/verify-login-otp — clinic admin OTP verification
router.post('/verify-login-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Verify clinic admin login OTP'
     #swagger.description = 'Complete 2FA login by verifying OTP sent to clinic admin phone'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { loginId: 'clinic_admin_1_abc123', otp: '123456' } }
     #swagger.responses[200] = { description: 'OTP verified', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid OTP' }
  */
  clinicAdminVerifyLoginOTP);

// POST /api/clinic/resend-login-otp — clinic admin OTP resend
router.post('/resend-login-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Resend clinic admin login OTP'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { loginId: 'clinic_admin_1_abc123' } }
     #swagger.responses[200] = { description: 'OTP resent' }
     #swagger.responses[429] = { description: 'Cooldown active' }
  */
  clinicAdminResendLoginOTP);

// POST /api/clinic/clinic-verify-login-otp — clinic entity OTP verification
router.post('/clinic-verify-login-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Verify clinic entity login OTP'
     #swagger.description = 'Complete 2FA login by verifying OTP sent to clinic phone'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { loginId: 'clinic_1_abc123', otp: '123456' } }
     #swagger.responses[200] = { description: 'OTP verified', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid OTP' }
  */
  clinicVerifyLoginOTP);

// POST /api/clinic/clinic-resend-login-otp — clinic entity OTP resend
router.post('/clinic-resend-login-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Resend clinic entity login OTP'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { loginId: 'clinic_1_abc123' } }
     #swagger.responses[200] = { description: 'OTP resent' }
     #swagger.responses[429] = { description: 'Cooldown active' }
  */
  clinicResendLoginOTP);

// ── Authenticated (clinic entity + clinic admin) ──

router.use(requireClinicAuth);
router.use(clinicAuditLog);

// Profile
router.get('/profile',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get clinic profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Clinic profile data' }
  */
  getProfile);
router.patch('/profile',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Update clinic profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { clinic_name: 'Updated Clinic' } }
     #swagger.responses[200] = { description: 'Profile updated' }
  */
  updateProfile);

// Cloudinary upload signature
router.get('/cloudinary-signature',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get Cloudinary upload signature'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Upload signature' }
  */
  getCloudinarySignatureHandler);

// GET /api/clinic/appointments
router.get('/appointments',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List clinic appointments'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Appointment list' }
  */
  listAppointments);

// GET /api/clinic/appointments/stats
router.get('/appointments/stats',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get appointment statistics'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Appointment stats' }
  */
  appointmentStats);

// ── Lookups (slots, symptoms, complaints) ──

router.get('/slots',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List clinic slots'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot list' }
  */
  listClinicSlots);
router.post('/slots',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Create a slot for this clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $doctor_id: 1, $slot_fee: 500, booking_fee: 50, $slot_day: 'MON', $slot_start: 18, $slot_end: 24 } }
     #swagger.responses[201] = { description: 'Slot created' }
  */
  createClinicSlot);
router.patch('/slots/:slot_id',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Update a slot owned by this clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot updated' }
  */
  updateClinicSlot);
router.delete('/slots/:slot_id',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Soft-delete a slot owned by this clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot deleted' }
  */
  deleteClinicSlot);
router.patch('/slots/:slot_id/restore',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Restore a soft-deleted slot owned by this clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot restored' }
  */
  restoreClinicSlot);
router.get('/symptoms',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List symptoms'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Symptom list' }
  */
  listSymptoms);
router.get('/complaints',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List complaints'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Complaint list' }
  */
  listComplaints);

// ── Clinic Admin Management (clinic entity only) ──

router.get('/clinic-admins',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List clinic admins'
     #swagger.description = 'Clinic entity only'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Clinic admin list' }
  */
  requireClinicOnly, listClinicAdmins);
router.post('/clinic-admins',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Create a clinic admin'
     #swagger.description = 'Clinic entity only'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { username: 'admin1', password: 'pass123', first_name: 'Jane', last_name: 'Doe' } }
     #swagger.responses[201] = { description: 'Clinic admin created' }
  */
  requireClinicOnly, createClinicAdmin);
router.patch('/clinic-admins/:id',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Update a clinic admin'
     #swagger.description = 'Clinic entity only'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic admin updated' }
  */
  requireClinicOnly, e2eGuard('clinic_manager', 'id'), updateClinicAdmin);
router.delete('/clinic-admins/:id',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Soft-delete a clinic admin'
     #swagger.description = 'Clinic entity only'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic admin deleted' }
  */
  requireClinicOnly, e2eGuard('clinic_manager', 'id'), deleteClinicAdmin);
router.patch('/clinic-admins/:id/restore',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Restore a soft-deleted clinic admin'
     #swagger.description = 'Clinic entity only'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic admin restored' }
  */
  requireClinicOnly, e2eGuard('clinic_manager', 'id'), restoreClinicAdmin);

// ── Booking Flow ──

router.post('/booking/lookup',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Lookup patient for booking'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { phone: '9876543210' } }
     #swagger.responses[200] = { description: 'Patient found or not found' }
  */
  bookingLookupLimit, lookupPatient);
router.post('/booking/send-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Send OTP for booking verification'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { phone: '9876543210' } }
     #swagger.responses[200] = { description: 'OTP sent' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  bookingOTPSendLimit, sendBookingOTP);
router.post('/booking/verify-otp',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Verify booking OTP'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { phone: '9876543210', otp: '123456' } }
     #swagger.responses[200] = { description: 'OTP verified' }
     #swagger.responses[400] = { description: 'Invalid OTP' }
  */
  bookingOTPVerifyLimit, verifyBookingOTP);
router.post('/booking/register-patient',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Register a new patient during booking'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { phone: '9876543210', first_name: 'John', last_name: 'Doe', gender: 'male', dob: '1990-01-01' } }
     #swagger.responses[201] = { description: 'Patient registered' }
  */
  registerBookingPatient);
router.post('/booking/create-appointment',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Create a booking appointment'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $user_id: 1, $slot_id: 1, $appointment_date: '2025-01-15', symptom_text: 'Headache', symptom_code: 'HEADACHE', complaints: '' } }
     #swagger.responses[201] = { description: 'Appointment created' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  createBookingAppointment);

// ── Leads (Patient Inquiries) ──

router.get('/leads',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List patient leads / inquiries'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Lead list' }
  */
  listLeads);
router.post('/leads',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Create a lead'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { name: 'John', phone: '9876543210', notes: 'Interested in consultation' } }
     #swagger.responses[201] = { description: 'Lead created' }
  */
  createLead);
router.patch('/leads/:id',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Update a lead'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { status: 'contacted' } }
     #swagger.responses[200] = { description: 'Lead updated' }
  */
  updateLead);

// ── Analytics ──

router.get('/analytics/appointments',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get appointment trends'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Appointment trend data' }
  */
  appointmentTrends);
router.get('/analytics/revenue',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get revenue summary'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Revenue summary data' }
  */
  revenueSummary);
router.get('/analytics/utilization',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get slot utilization analytics'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Slot utilization data' }
  */
  slotUtilization);
router.get('/analytics/top-doctors',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get top-performing doctors'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Top doctors data' }
  */
  topDoctors);

// ── Prescriptions (metadata only) ──

router.get('/prescriptions',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List clinic prescriptions'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Prescription list' }
  */
  listClinicPrescriptions);
router.get('/prescriptions/:appointmentId',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'Get prescription detail'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['appointmentId'] = { in: 'path', required: true, type: 'integer', description: 'Appointment ID' }
     #swagger.responses[200] = { description: 'Prescription detail' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getClinicPrescriptionDetail);

// ── Audit Logs ──

router.get('/audit-logs',
  /* #swagger.tags = ['Clinic']
     #swagger.summary = 'List clinic audit logs'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Audit log list' }
  */
  listClinicAuditLogs);

module.exports = router;
