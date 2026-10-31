const { verifyToken } = require('../jwt');

/**
 * Middleware to protect doctor-only routes.
 * Expects: Authorization: Bearer <token>
 * Token payload must contain: { role: 'doctor', doctor_id }
 */
function requireDoctor(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[DoctorAuth] No token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authorization token provided' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    console.warn(`[DoctorAuth] Invalid/expired token | ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }

  if (payload.role !== 'doctor' || !payload.doctor_id) {
    console.warn(`[DoctorAuth] Wrong role ("${payload.role}") | ${req.method} ${req.originalUrl} | doctor_id=${payload.doctor_id} | IP: ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden', message: 'Doctor access required' });
  }

  req.doctorId = payload.doctor_id;
  req.username = payload.username;
  next();
}

module.exports = { requireDoctor };
