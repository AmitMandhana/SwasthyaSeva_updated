const supabase = require('../../db');

const USER_TYPE_TABLE = {
  doctors: 'doctors',
  clinics: 'clinics',
  'clinic-managers': 'clinic_admins',
};

/**
 * Checks if a username is already taken within a specific user type's table.
 * @param {string} username
 * @param {'doctors'|'clinics'|'clinic-managers'} userType
 * @param {{ clinicId?: number }} [opts]
 * @returns {Promise<{ available: boolean }>}
 */
async function checkUsernameAvailability(username, userType, { clinicId } = {}) {
  const table = USER_TYPE_TABLE[userType];
  if (!table) throw new Error(`Unknown userType: ${userType}`);

  let query = supabase
    .from(table)
    .select('username')
    .ilike('username', username);

  if (userType === 'clinic-managers') {
    if (!clinicId) return { available: false };
    query = query.eq('clinic_id', clinicId);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    if (error.code === '42P01') return { available: true };
    throw error;
  }

  return { available: !data };
}

module.exports = { checkUsernameAvailability };
