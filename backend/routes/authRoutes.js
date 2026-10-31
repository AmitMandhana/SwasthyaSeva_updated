const express = require("express");
const router = express.Router();
const { initiateRegistration, complete } = require("../controllers/register");
const { requireAuth, requireClinicAdmin } = require("../middleware/auth");
const { 
  initiateRegistrationRateLimit, 
  initiateRegistrationDailyLimit,
  completeRegistrationRateLimit
} = require("../ratelimits/registration");

// Registration endpoints - require authentication and clinic admin role
router.post(
  "/register/initiate",
  /* #swagger.tags = ['Auth']
     #swagger.summary = 'Initiate patient registration'
     #swagger.description = 'Start registration flow for a new patient (requires clinic admin auth)'
     #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $phone: '9876543210', $first_name: 'John', $last_name: 'Doe', $gender: 'male', $dob: '1990-01-01', $street_address: '123 Main St', $city: 'Mumbai', $state: 'Maharashtra', $country: 'India', $location_x: 72.8777, $location_y: 19.0760, email: '', occupation: '', attendant_name: '', attendant_relationship: '' }
     }
     #swagger.responses[200] = { description: 'Registration initiated', schema: { success: true, user_id: 1 } }
     #swagger.responses[400] = { description: 'Validation error' }
     #swagger.responses[401] = { description: 'Unauthorized' }
     #swagger.security = [{ "bearerAuth": [] }]
  */
  requireAuth,
  requireClinicAdmin,
  initiateRegistrationRateLimit,
  initiateRegistrationDailyLimit,
  initiateRegistration
);

router.post(
  "/register/complete",
  /* #swagger.tags = ['Auth']
     #swagger.summary = 'Complete patient registration'
     #swagger.description = 'Verify OTP and finalize patient registration (requires clinic admin auth)'
     #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $user_id: 1, $otp: '123456' }
     }
     #swagger.responses[200] = { description: 'Registration completed', schema: { success: true } }
     #swagger.responses[400] = { description: 'Invalid or expired OTP' }
     #swagger.responses[401] = { description: 'Unauthorized' }
     #swagger.security = [{ "bearerAuth": [] }]
  */
  requireAuth,
  requireClinicAdmin,
  completeRegistrationRateLimit,
  complete
);

module.exports = router;
