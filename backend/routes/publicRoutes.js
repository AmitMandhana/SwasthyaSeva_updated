const { Router } = require('express');
const { publicSlotSearchHandler } = require('../controllers/public/slotSearchController');
const { publicDoctorProfileHandler, publicClinicProfileHandler, publicDoctorScheduleHandler } = require('../controllers/public/profileController');
const { createPublicInquiry } = require('../controllers/public/inquiryController');
const { publicSearchRateLimit, publicTagsRateLimit, publicProfileRateLimit, publicInquiryRateLimit } = require('../ratelimits/publicSearch');
const { getTags } = require('../queries/read/getTags');

const router = Router();

// POST /api/public/slots/search — public slot search with captcha
router.post('/slots/search',
  /* #swagger.tags = ['Public']
     #swagger.summary = 'Search available slots'
     #swagger.description = 'Search for available doctor slots by location and tags'
     #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $lat: 28.6, $lng: 77.2, tags: ['general'], maxDistanceKm: 10 }
     }
     #swagger.responses[200] = { description: 'Matching slots', schema: { slots: [] } }
     #swagger.responses[400] = { description: 'Validation error' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  publicSearchRateLimit, publicSlotSearchHandler);

// GET /api/public/tags — public tag list for search filters (no captcha needed)
router.get('/tags', publicTagsRateLimit, async (req, res) => {
  /* #swagger.tags = ['Public']
     #swagger.summary = 'List all tags'
     #swagger.description = 'Get tag list for search filters (no auth required)'
     #swagger.responses[200] = { description: 'Tag list', schema: { tags: [] } }
     #swagger.responses[500] = { description: 'Internal Server Error' }
  */
  try {
    const tags = await getTags();
    return res.status(200).json({ tags });
  } catch (err) {
    console.error('[Public Tags]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/public/doctors/:username — public doctor profile
router.get('/doctors/:username',
  /* #swagger.tags = ['Public']
     #swagger.summary = 'Get public doctor profile'
     #swagger.description = 'Retrieve a doctor profile by username (public, no auth)'
     #swagger.parameters['username'] = { in: 'path', required: true, type: 'string', description: 'Doctor username' }
     #swagger.responses[200] = { description: 'Doctor profile' }
     #swagger.responses[404] = { description: 'Doctor not found' }
  */
  publicProfileRateLimit, publicDoctorProfileHandler);

// GET /api/public/doctors/:username/schedule — doctor's weekly schedule (slots + clinics)
router.get('/doctors/:username/schedule',
  /* #swagger.tags = ['Public']
     #swagger.summary = 'Get doctor weekly schedule'
     #swagger.description = 'Returns all active slots for a doctor with clinic info (no auth required)'
     #swagger.parameters['username'] = { in: 'path', required: true, type: 'string', description: 'Doctor username' }
     #swagger.responses[200] = { description: 'Doctor schedule', schema: { slots: [] } }
     #swagger.responses[400] = { description: 'Invalid username' }
  */
  publicProfileRateLimit, publicDoctorScheduleHandler);

// GET /api/public/clinics/:username — public clinic profile
router.get('/clinics/:username',
  /* #swagger.tags = ['Public']
     #swagger.summary = 'Get public clinic profile'
     #swagger.description = 'Retrieve a clinic profile by username (public, no auth)'
     #swagger.parameters['username'] = { in: 'path', required: true, type: 'string', description: 'Clinic username' }
     #swagger.responses[200] = { description: 'Clinic profile' }
     #swagger.responses[404] = { description: 'Clinic not found' }
  */
  publicProfileRateLimit, publicClinicProfileHandler);

// POST /api/public/inquiries — public patient inquiry submission
router.post('/inquiries',
  /* #swagger.tags = ['Public']
     #swagger.summary = 'Submit a patient inquiry'
     #swagger.description = 'Public patient inquiry submission (no auth required)'
     #swagger.parameters['body'] = {
       in: 'body', required: true,
       schema: { $name: 'John Doe', $phone: '9876543210', message: 'I need an appointment' }
     }
     #swagger.responses[201] = { description: 'Inquiry submitted' }
     #swagger.responses[400] = { description: 'Validation error' }
     #swagger.responses[429] = { description: 'Rate limit exceeded' }
  */
  publicInquiryRateLimit, createPublicInquiry);

module.exports = router;
