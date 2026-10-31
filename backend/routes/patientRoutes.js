const { Router } = require('express');
const { patientLoginPassword, requestPatientOTP, verifyPatientOTP } = require('../controllers/patient/authController');
const { requirePatient } = require('../middleware/patientAuth');
const { patientLoginRateLimit, patientOTPRequestRateLimit, patientOTPVerifyRateLimit } = require('../ratelimits/patientAuth');
const { listPrescriptions, getPrescriptionDetail } = require('../controllers/patient/prescriptionController');
const { getProfile, updateProfile } = require('../controllers/patient/profileController');
const { listAppointments } = require('../controllers/patient/appointmentController');
const { getDashboard, getActiveMedications } = require('../controllers/patient/dashboardController');
const { getCloudinarySignatureHandler } = require('../controllers/admin/cloudinaryController');

const router = Router();

// --- Public auth routes (no token required) ---
router.post('/login',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Patient login with password'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $phone: '9876543210', $password: 'password123', $first_name: 'John', $last_name: 'Doe' } }
     #swagger.responses[200] = { description: 'Login successful', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid credentials' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  patientLoginRateLimit, patientLoginPassword);
router.post('/request-otp',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Request OTP for patient login'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $phone: '9876543210', $first_name: 'John', $last_name: 'Doe' } }
     #swagger.responses[200] = { description: 'OTP sent' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  patientOTPRequestRateLimit, requestPatientOTP);
router.post('/verify-otp',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Verify patient OTP'
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $phone: '9876543210', $otp: '123456', $first_name: 'John', $last_name: 'Doe' } }
     #swagger.responses[200] = { description: 'OTP verified, token returned', schema: { token: 'jwt-token' } }
     #swagger.responses[400] = { description: 'Invalid or expired OTP' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  patientOTPVerifyRateLimit, verifyPatientOTP);

// --- Protected routes (requirePatient) ---
router.use(requirePatient);

// Profile
router.get('/profile',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Get patient profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Patient profile data' }
  */
  getProfile);
router.patch('/profile',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Update patient profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { first_name: 'John', last_name: 'Doe' } }
     #swagger.responses[200] = { description: 'Profile updated' }
  */
  updateProfile);

// Cloudinary upload signature
router.get('/cloudinary-signature',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Get Cloudinary upload signature'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Upload signature' }
  */
  getCloudinarySignatureHandler);

// Appointments
router.get('/appointments',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'List patient appointments'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Appointment list' }
  */
  listAppointments);

router.get('/prescriptions',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'List patient prescriptions'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Prescription list' }
  */
  listPrescriptions);
router.get('/prescriptions/:appointmentId',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Get prescription detail'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['appointmentId'] = { in: 'path', required: true, type: 'integer', description: 'Appointment ID' }
     #swagger.responses[200] = { description: 'Prescription detail' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getPrescriptionDetail);

router.get('/dashboard',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Get dashboard summary'
     #swagger.security = [{ "bearerAuth": [] }]
  */
  getDashboard);

router.get('/active-medications',
  /* #swagger.tags = ['Patient']
     #swagger.summary = 'Get active medications from most recent prescription'
     #swagger.security = [{ "bearerAuth": [] }]
  */
  getActiveMedications);

module.exports = router;
