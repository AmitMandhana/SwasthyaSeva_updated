const { checkUsernameAvailability } = require('../../queries/read/checkUsername');

const VALID_USER_TYPES = ['doctors', 'clinics', 'clinic-managers'];

/**
 * GET /api/admin/check-username/:userType?username=xxx[&clinic_id=1]
 */
async function checkUsernameHandler(req, res) {
  const { userType } = req.params;
  const { username, clinic_id } = req.query;

  if (!VALID_USER_TYPES.includes(userType)) {
    return res.status(400).json({ error: 'Bad Request', message: `userType must be one of: ${VALID_USER_TYPES.join(', ')}` });
  }
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  let clinicId;
  if (userType === 'clinic-managers') {
    clinicId = parseInt(clinic_id, 10);
    if (!clinic_id || !Number.isInteger(clinicId) || clinicId < 1) {
      return res.status(400).json({ error: 'Bad Request', message: 'clinic_id is required for clinic-managers' });
    }
  }

  try {
    const result = await checkUsernameAvailability(username.trim().toLowerCase(), userType, { clinicId });
    return res.json(result);
  } catch (err) {
    console.error('[Check Username] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { checkUsernameHandler };
