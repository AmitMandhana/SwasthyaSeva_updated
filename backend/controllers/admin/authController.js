const bcrypt = require('bcrypt');
const { getAdminByUsername } = require('../../queries/read/getAdminByUsername');
const { generateToken } = require('../../jwt');
const validateWithSchema = require('../../validators/validator');
const adminLoginSchema = require('../../validators/schemas/adminLoginSchema');
const { createActiveToken } = require('../../queries/create/createActiveToken');
const { getActiveTokensByUser } = require('../../queries/read/getActiveTokens');
const { deleteActiveTokenById } = require('../../queries/delete/deleteActiveToken');
const { createAuditLog } = require('../../queries/create/createAuditLog');
const { admin: adminAuth } = require('../../config/auth');

const ADMIN_DEVICE_LIMIT = adminAuth.deviceLimit;
const ADMIN_TOKEN_EXPIRY_MINUTES = adminAuth.tokenExpiryMinutes;

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { token } on success, 401 on bad credentials
 */
async function adminLogin(req, res) {
  // Schema validation
  const { success, data, errors } = validateWithSchema(adminLoginSchema, req.body, { encryptPII: false });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  const { username, password } = data;

  const admin = await getAdminByUsername(username);

  // Use a constant-time comparison even when admin doesn't exist to prevent user enumeration
  const dummyHash = '$2b$12$invalidhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXX';
  const hashToCompare = admin ? admin.password_hash : dummyHash;
  const match = await bcrypt.compare(password, hashToCompare);

  if (!admin || !match) {
    const reason = !admin ? 'user not found' : 'wrong password';
    console.warn(`[Admin Login] FAILED for username="${username}" — ${reason} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
  }

  console.log(`[Admin Login] SUCCESS for username="${username}" (admin_id=${admin.admin_id}) | IP: ${req.ip}`);

  const token = generateToken(
    { role: 'admin', admin_id: admin.admin_id, username: admin.username },
    { expiresIn: `${ADMIN_TOKEN_EXPIRY_MINUTES}m` }
  );

  // Store active token and enforce device limit
  const expires_at = new Date(Date.now() + ADMIN_TOKEN_EXPIRY_MINUTES * 60 * 1000);
  try {
    await createActiveToken({ token, role: 'admin', user_id: admin.admin_id, ip_address: req.ip, expires_at });

    // Evict oldest sessions if over limit
    const activeSessions = await getActiveTokensByUser('admin', admin.admin_id);
    if (activeSessions.length > ADMIN_DEVICE_LIMIT) {
      const toEvict = activeSessions.slice(0, activeSessions.length - ADMIN_DEVICE_LIMIT);
      for (const session of toEvict) {
        await deleteActiveTokenById(session.token_id);
      }
      console.log(`[Admin Login] Evicted ${toEvict.length} oldest session(s) for admin_id=${admin.admin_id}`);
    }
  } catch (err) {
    console.error('[Admin Login] Failed to manage active tokens:', err.message);
    // Don't block login if token tracking fails
  }

  // Audit log for successful login (runs before auth middleware so logged manually)
  createAuditLog({
    admin_id: admin.admin_id,
    admin_username: admin.username,
    action: 'login',
    entity_type: 'session',
    entity_id: null,
    entity_username: admin.username,
    endpoint: 'POST /api/admin/login',
    data: { username },
    ip_address: req.ip,
  }).catch((err) => console.error('[AuditLog] Failed to log login:', err.message));

  return res.status(200).json({ token });
}

module.exports = { adminLogin };
