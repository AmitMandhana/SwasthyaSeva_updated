const { verifyToken } = require('../jwt');
const { hashToken } = require('../queries/create/createActiveToken');
const { isTokenActive } = require('../queries/read/getActiveTokens');

/**
 * Middleware to protect admin-only routes.
 * Expects: Authorization: Bearer <token>
 * Token payload must contain: { role: 'admin', admin_id }
 * Also verifies the token is in the active_tokens table.
 */
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AdminAuth] No token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authorization token provided' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    console.warn(`[AdminAuth] Invalid/expired token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (payload.role !== 'admin' || !payload.admin_id) {
    console.warn(`[AdminAuth] Wrong role ("${payload.role}") | ${req.method} ${req.originalUrl} | admin_id=${payload.admin_id} | IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }

  // Verify token is still in active_tokens (not evicted or logged out)
  try {
    const active = await isTokenActive(hashToken(token));
    if (!active) {
      console.warn(`[AdminAuth] Token revoked/evicted | admin_id=${payload.admin_id} | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Session expired or revoked. Please log in again.' });
    }
  } catch (err) {
    console.error('[AdminAuth] Active token check failed:', err.message);
    // Don't block request if active_tokens table is unavailable
  }

  req.adminId = payload.admin_id;
  req.adminUsername = payload.username || 'unknown';
  next();
}

module.exports = { requireAdmin };
