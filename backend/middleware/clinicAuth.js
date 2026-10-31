const { verifyToken } = require('../jwt');

/**
 * Middleware to protect clinic admin routes.
 * Expects: Authorization: Bearer <token>
 * Token payload must contain: { role: 'clinic_admin', clinic_admin_id, clinic_id }
 */
function requireClinicAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[ClinicAuth] No token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authorization token provided' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    console.warn(`[ClinicAuth] Invalid/expired token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (payload.role !== 'clinic_admin' || !payload.clinic_admin_id || !payload.clinic_id) {
    console.warn(`[ClinicAuth] Wrong role ("${payload.role}") | ${req.method} ${req.originalUrl} | clinic_admin_id=${payload.clinic_admin_id} | IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden', message: 'Clinic admin access required' });
  }

  req.clinicAdminId = payload.clinic_admin_id;
  req.clinicId = payload.clinic_id;
  req.username = payload.username;
  next();
}

/**
 * Combined middleware: accepts both 'clinic' and 'clinic_admin' roles.
 * Sets req.clinicId, req.role, req.actorName, and optionally req.clinicAdminId.
 */
function requireClinicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[ClinicAuth] No token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authorization token provided' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    console.warn(`[ClinicAuth] Invalid/expired token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (payload.role === 'clinic_admin' && payload.clinic_admin_id && payload.clinic_id) {
    req.clinicId = payload.clinic_id;
    req.clinicAdminId = payload.clinic_admin_id;
    req.role = 'clinic_admin';
    req.actorName = payload.username || payload.name || 'unknown';
    req.username = payload.username;
    return next();
  }

  if (payload.role === 'clinic' && payload.clinic_id) {
    req.clinicId = payload.clinic_id;
    req.role = 'clinic';
    req.actorName = payload.name || 'unknown';
    return next();
  }

  console.warn(`[ClinicAuth] Wrong role ("${payload.role}") | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
  return res.status(403).json({ error: 'Forbidden', message: 'Clinic access required' });
}

/**
 * Restricts to clinic entity only (blocks clinic_admin).
 * Must be used after requireClinicAuth.
 */
function requireClinicOnly(req, res, next) {
  if (req.role !== 'clinic') {
    return res.status(403).json({ error: 'Forbidden', message: 'Clinic entity access required' });
  }
  next();
}

module.exports = { requireClinicAdmin, requireClinicAuth, requireClinicOnly };
