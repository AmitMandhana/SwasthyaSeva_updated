const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initAdminsSQL = require('../init/initAdmins');

/**
 * Inserts a new admin into the Admins table.
 * @param {string} username
 * @param {string} passwordHash - bcrypt hash
 * @returns {Promise<{admin_id: number, username: string, created_at: string}>}
 */
async function createAdmin(username, passwordHash) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('admins')
        .insert({ username, password_hash: passwordHash })
        .select('admin_id, username, created_at')
        .single();

      if (error) throw error;
      return data;
    },
    initAdminsSQL
  );
}

module.exports = { createAdmin };
