const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initAdminsSQL = require('../init/initAdmins');

/**
 * Fetches an admin record by username.
 * @param {string} username
 * @returns {Promise<{admin_id: number, username: string, password_hash: string}|null>}
 */
async function getAdminByUsername(username) {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('admins')
        .select('admin_id, username, password_hash')
        .eq('username', username)
        .maybeSingle();
    },
    initAdminsSQL
  );

  if (result.error) throw result.error;
  return result.data;
}

module.exports = { getAdminByUsername };
