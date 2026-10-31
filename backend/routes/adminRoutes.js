const { Router } = require('express');
const { DEV_MODE } = require('../config/env');
const { adminLogin } = require('../controllers/admin/authController');
const {
  createDoctorHandler,
  listDoctorsHandler,
  searchDoctorsHandler,
  getDoctorHandler,
  updateDoctorHandler,
  deleteDoctorHandler,
  restoreDoctorHandler,
} = require('../controllers/admin/doctorController');
const {
  createClinicHandler,
  listClinicsHandler,
  searchClinicsHandler,
  getClinicHandler,
  updateClinicHandler,
  deleteClinicHandler,
  restoreClinicHandler,
} = require('../controllers/admin/clinicController');
const {
  createClinicManagerHandler,
  listClinicManagersHandler,
  searchClinicManagersHandler,
  getClinicManagerHandler,
  updateClinicManagerHandler,
  deleteClinicManagerHandler,
  restoreClinicManagerHandler,
} = require('../controllers/admin/clinicManagerController');
const {
  createSlotHandler,
  listSlotsHandler,
  getSlotHandler,
  updateSlotHandler,
  deleteSlotHandler,
  restoreSlotHandler,
} = require('../controllers/admin/slotController');
const {
  listSpecializationsHandler,
  listTagsHandler,
  listExtraQualificationsHandler,
  listStatesHandler,
} = require('../controllers/admin/lookupController');
const {
  addDoctorExtraQualificationHandler,
  listDoctorExtraQualificationsHandler,
  removeDoctorExtraQualificationHandler,
} = require('../controllers/admin/doctorExtraQualificationController');
const {
  getCloudinarySignatureHandler,
} = require('../controllers/admin/cloudinaryController');
const { adminLogout } = require('../controllers/admin/logoutController');
const { checkUsernameHandler } = require('../controllers/admin/usernameController');
const { placesAutocompleteHandler, placesDetailsHandler, getAddressByMapUrlHandler, reverseGeocodeHandler } = require('../controllers/admin/placesController');
const { getProfile: getAdminProfile, updateProfile: updateAdminProfile } = require('../controllers/admin/profileController');
const { adminLoginRateLimit } = require('../ratelimits/adminLogin');
const { requireAdmin } = require('../middleware/adminAuth');
const { e2eGuard } = require('../middleware/e2eGuard');

const router = Router();

// ── Public (pre-auth) ──
router.post('/login',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Admin login'
     #swagger.description = 'Authenticate an admin user with username and password'
     #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $username: 'admin', $password: 'password123' }
     }
     #swagger.responses[200] = { description: 'Login successful', schema: { token: 'jwt-token' } }
     #swagger.responses[401] = { description: 'Invalid credentials' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  adminLoginRateLimit, adminLogin);

// ── All routes below require admin auth and are audit-logged ──
router.use(requireAdmin);

// --- Logout ---
router.post('/logout',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Admin logout'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Logged out' }
  */
  adminLogout);

// --- Profile ---
router.get('/profile',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get admin profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Admin profile data' }
  */
  getAdminProfile);
router.patch('/profile',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update admin profile'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { first_name: 'Admin', last_name: 'User' } }
     #swagger.responses[200] = { description: 'Profile updated' }
  */
  updateAdminProfile);

// --- Doctor CRUD ---
router.post('/doctors',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create a doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $username: 'drsmith', $first_name: 'Dr', $last_name: 'Smith', $phone: '9876543210', $base_degree_code: 'MBBS', $license_no: 'LIC001', postgrad_specialization_code: '', super_specialization_code: '', bio: '', pfp_link: '', banner_link: '', signature_link: '', password: '', prescription_format: 'GEN_MED' } }
     #swagger.responses[201] = { description: 'Doctor created' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  createDoctorHandler);
router.get('/doctors',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all doctors'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['page'] = { in: 'query', type: 'integer', description: 'Page number' }
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Items per page' }
     #swagger.responses[200] = { description: 'Doctor list', schema: { doctors: [], total: 0 } }
  */
  listDoctorsHandler);
router.post('/doctors/search',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Search doctors'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { query: 'smith' } }
     #swagger.responses[200] = { description: 'Search results' }
  */
  searchDoctorsHandler);
router.get('/doctors/:doctor_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get doctor by ID'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Doctor details' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getDoctorHandler);
router.patch('/doctors/:doctor_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update a doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { first_name: 'Dr', last_name: 'Smith', phone: '', license_no: '', pfp_link: '', banner_link: '', signature_link: '', bio: '', password: '', prescription_format: '' } }
     #swagger.responses[200] = { description: 'Doctor updated' }
  */
  e2eGuard('doctor', 'doctor_id'), updateDoctorHandler);
router.delete('/doctors/:doctor_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Soft-delete a doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Doctor deleted' }
  */
  e2eGuard('doctor', 'doctor_id'), deleteDoctorHandler);
router.patch('/doctors/:doctor_id/restore',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Restore a soft-deleted doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Doctor restored' }
  */
  e2eGuard('doctor', 'doctor_id'), restoreDoctorHandler);

// --- Doctor Extra Qualifications ---
router.post('/doctors/:doctor_id/extra-qualifications',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Add extra qualification to doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { qualification_code: 'MBBS' } }
     #swagger.responses[201] = { description: 'Qualification added' }
  */
  addDoctorExtraQualificationHandler);
router.get('/doctors/:doctor_id/extra-qualifications',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List doctor extra qualifications'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Qualification list' }
  */
  listDoctorExtraQualificationsHandler);
router.delete('/doctors/:doctor_id/extra-qualifications/:qualification_code',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Remove extra qualification from doctor'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['doctor_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['qualification_code'] = { in: 'path', required: true, type: 'string' }
     #swagger.responses[200] = { description: 'Qualification removed' }
  */
  removeDoctorExtraQualificationHandler);

// --- Clinic CRUD ---
router.post('/clinics',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create a clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $username: 'healthclinic', $phone: '9876543210', $license_no: 'REG001', $street_address: '123 Main St', $city: 'Mumbai', clinic_name: 'Health Clinic', state: 'Maharashtra', pincode: '400001', location_x: 72.8777, location_y: 19.0760, country: 'India', pfp_link: '', banner_link: '', password: '' } }
     #swagger.responses[201] = { description: 'Clinic created' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  createClinicHandler);
router.get('/clinics',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all clinics'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['page'] = { in: 'query', type: 'integer', description: 'Page number' }
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Items per page' }
     #swagger.responses[200] = { description: 'Clinic list', schema: { clinics: [], total: 0 } }
  */
  listClinicsHandler);
router.post('/clinics/search',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Search clinics'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { query: 'health' } }
     #swagger.responses[200] = { description: 'Search results' }
  */
  searchClinicsHandler);
router.get('/clinics/:clinic_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get clinic by ID'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic details' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getClinicHandler);
router.patch('/clinics/:clinic_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update a clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { clinic_name: 'Updated Clinic' } }
     #swagger.responses[200] = { description: 'Clinic updated' }
  */
  e2eGuard('clinic', 'clinic_id'), updateClinicHandler);
router.delete('/clinics/:clinic_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Soft-delete a clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic deleted' }
  */
  e2eGuard('clinic', 'clinic_id'), deleteClinicHandler);
router.patch('/clinics/:clinic_id/restore',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Restore a soft-deleted clinic'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic restored' }
  */
  e2eGuard('clinic', 'clinic_id'), restoreClinicHandler);

// --- Clinic Manager CRUD ---
router.post('/clinic-managers',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create a clinic manager'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $clinic_id: 1, $name: 'Jane Doe', $username: 'manager1', $phone: '9876543210', pfp_link: '', password: '' } }
     #swagger.responses[201] = { description: 'Clinic manager created' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  createClinicManagerHandler);
router.get('/clinic-managers',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all clinic managers'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['page'] = { in: 'query', type: 'integer', description: 'Page number' }
     #swagger.parameters['limit'] = { in: 'query', type: 'integer', description: 'Items per page' }
     #swagger.responses[200] = { description: 'Clinic manager list' }
  */
  listClinicManagersHandler);
router.post('/clinic-managers/search',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Search clinic managers'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { query: 'jane' } }
     #swagger.responses[200] = { description: 'Search results' }
  */
  searchClinicManagersHandler);
router.get('/clinic-managers/:clinic_admin_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get clinic manager by ID'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_admin_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic manager details' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getClinicManagerHandler);
router.patch('/clinic-managers/:clinic_admin_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update a clinic manager'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_admin_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { first_name: 'Jane' } }
     #swagger.responses[200] = { description: 'Clinic manager updated' }
  */
  e2eGuard('clinic_manager', 'clinic_admin_id'), updateClinicManagerHandler);
router.delete('/clinic-managers/:clinic_admin_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Soft-delete a clinic manager'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_admin_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic manager deleted' }
  */
  e2eGuard('clinic_manager', 'clinic_admin_id'), deleteClinicManagerHandler);
router.patch('/clinic-managers/:clinic_admin_id/restore',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Restore a soft-deleted clinic manager'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['clinic_admin_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Clinic manager restored' }
  */
  e2eGuard('clinic_manager', 'clinic_admin_id'), restoreClinicManagerHandler);

// --- Slot CRUD ---
router.post('/slots',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create a slot'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { $doctor_id: 1, $clinic_id: 1, $slot_day: 'MON', $slot_start: 18, $slot_end: 22, $slot_fee: 500, booking_fee: 0 } }
     #swagger.responses[201] = { description: 'Slot created' }
     #swagger.responses[400] = { description: 'Validation error' }
  */
  createSlotHandler);
router.get('/slots',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all slots'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['page'] = { in: 'query', type: 'integer' }
     #swagger.parameters['limit'] = { in: 'query', type: 'integer' }
     #swagger.responses[200] = { description: 'Slot list' }
  */
  listSlotsHandler);
router.get('/slots/:slot_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get slot by ID'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['slot_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Slot details' }
     #swagger.responses[404] = { description: 'Not found' }
  */
  getSlotHandler);
router.patch('/slots/:slot_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update a slot'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['slot_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { slot_fee: 600 } }
     #swagger.responses[200] = { description: 'Slot updated' }
  */
  e2eGuard('slot', 'slot_id'), updateSlotHandler);
router.delete('/slots/:slot_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Soft-delete a slot'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['slot_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Slot deleted' }
  */
  e2eGuard('slot', 'slot_id'), deleteSlotHandler);
router.patch('/slots/:slot_id/restore',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Restore a soft-deleted slot'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['slot_id'] = { in: 'path', required: true, type: 'integer' }
     #swagger.responses[200] = { description: 'Slot restored' }
  */
  e2eGuard('slot', 'slot_id'), restoreSlotHandler);

// --- Lookup endpoints ---
router.get('/specializations',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all specializations'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Specialization list' }
  */
  listSpecializationsHandler);
router.get('/tags',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all tags'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Tag list' }
  */
  listTagsHandler);
router.get('/extra-qualifications',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all extra qualifications'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Extra qualification list' }
  */
  listExtraQualificationsHandler);
router.get('/states',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'List all states'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'State list' }
  */
  listStatesHandler);

// --- Username availability ---
router.get('/check-username/:userType',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Check username availability'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['userType'] = { in: 'path', required: true, type: 'string', description: 'User type (doctor, clinic, etc.)' }
     #swagger.parameters['username'] = { in: 'query', required: true, type: 'string', description: 'Username to check' }
     #swagger.responses[200] = { description: 'Availability result', schema: { available: true } }
  */
  checkUsernameHandler);

// --- Google Places proxy ---
router.get('/places/autocomplete',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Places autocomplete'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['input'] = { in: 'query', required: true, type: 'string', description: 'Search input text' }
     #swagger.responses[200] = { description: 'Autocomplete suggestions' }
  */
  placesAutocompleteHandler);
router.get('/places/details',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get place details'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['place_id'] = { in: 'query', required: true, type: 'string', description: 'Google Place ID' }
     #swagger.responses[200] = { description: 'Place details' }
  */
  placesDetailsHandler);

// --- Address by map URL ---
router.get('/address-by-map-url',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get address from Google Maps URL'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['url'] = { in: 'query', required: true, type: 'string', description: 'Google Maps URL' }
     #swagger.responses[200] = { description: 'Address details' }
  */
  getAddressByMapUrlHandler);

// --- Reverse geocode ---
router.get('/geocode/reverse',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Reverse geocode coordinates'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['lat'] = { in: 'query', required: true, type: 'number', description: 'Latitude' }
     #swagger.parameters['lng'] = { in: 'query', required: true, type: 'number', description: 'Longitude' }
     #swagger.responses[200] = { description: 'Address from coordinates' }
  */
  reverseGeocodeHandler);

// --- Cloudinary ---
router.get('/cloudinary-signature',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get Cloudinary upload signature'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Upload signature', schema: { signature: '', timestamp: 0, cloudName: '', apiKey: '' } }
  */
  getCloudinarySignatureHandler);

// --- Softboard (Kanban) ---
const { getBoard, createColumn, patchColumn, removeColumn, reorderColumns, createCard, patchCard, removeCard, moveCard } = require('../controllers/admin/softboardController');

router.get('/softboard',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Get softboard (all columns + cards)'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Board data' }
  */
  getBoard);
router.post('/softboard/columns',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create softboard column'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { title: 'To Do' } }
     #swagger.responses[201] = { description: 'Column created' }
  */
  createColumn);
router.patch('/softboard/columns/:column_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update softboard column'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { title: 'Updated Title' } }
     #swagger.responses[200] = { description: 'Column updated' }
  */
  patchColumn);
router.delete('/softboard/columns/:column_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Delete softboard column'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Column deleted' }
  */
  removeColumn);
router.put('/softboard/columns/reorder',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Reorder softboard columns'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { columnIds: [3, 1, 2] } }
     #swagger.responses[200] = { description: 'Columns reordered' }
  */
  reorderColumns);
router.post('/softboard/cards',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Create softboard card'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { column_id: 1, title: 'Task', description: 'Details' } }
     #swagger.responses[201] = { description: 'Card created' }
  */
  createCard);
router.patch('/softboard/cards/:card_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Update softboard card'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { title: 'Updated', description: 'New details' } }
     #swagger.responses[200] = { description: 'Card updated' }
  */
  patchCard);
router.delete('/softboard/cards/:card_id',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Delete softboard card'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.responses[200] = { description: 'Card deleted' }
  */
  removeCard);
router.put('/softboard/cards/move',
  /* #swagger.tags = ['Admin']
     #swagger.summary = 'Move softboard card to another column'
     #swagger.security = [{ "bearerAuth": [] }]
     #swagger.parameters['body'] = { in: 'body', required: true, schema: { cardId: 1, targetColumnId: 2, targetPosition: 0 } }
     #swagger.responses[200] = { description: 'Card moved' }
  */
  moveCard);

// Plaintext OTPs must never be readable in production. DEV_MODE is refused
// outright when NODE_ENV=production, so this is dev-only by construction.
if (DEV_MODE) {
  const { getOtpStatus } = require('../controllers/admin/otpMonitorController');
  router.get('/otp-monitor',
    /* #swagger.tags = ['Admin']
       #swagger.summary = 'Get active OTP status for monitoring (DEV_MODE only)'
       #swagger.security = [{ "bearerAuth": [] }]
       #swagger.responses[200] = { description: 'Active OTPs and debug config' }
    */
    getOtpStatus);
}

module.exports = router;
