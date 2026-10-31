const { hashToken } = require('../../queries/create/createActiveToken');
const { deleteActiveTokenByHash } = require('../../queries/delete/deleteActiveToken');

/**
 * POST /api/admin/logout
 * Removes the current token from active_tokens.
 */
async function adminLogout(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({ message: 'Logged out' });
  }

  const token = authHeader.slice(7);
  try {
    await deleteActiveTokenByHash(hashToken(token));
    console.log(`[Admin Logout] Token removed for admin_id=${req.adminId} | IP: ${req.ip}`);
  } catch (err) {
    console.error('[Admin Logout] Failed to remove token:', err.message);
  }

  return res.status(200).json({ message: 'Logged out' });
}

module.exports = { adminLogout };
