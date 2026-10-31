const { verifyToken } = require('../jwt');

/**
 * Middleware to protect patient-only routes.
 * Expects: Authorization: Bearer <token>
 * Token payload must contain: { role: 'patient', user_id }
 */
function requirePatient(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[PatientAuth] No token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authorization token provided' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    console.warn(`[PatientAuth] Invalid/expired token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (payload.role !== 'patient' || !payload.user_id) {
    console.warn(`[PatientAuth] Wrong role ("${payload.role}") | ${req.method} ${req.originalUrl} | user_id=${payload.user_id} | IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden', message: 'Patient access required' });
  }

  req.userId = payload.user_id;
  req.patientName = payload.name;
  next();
}

module.exports = { requirePatient };
