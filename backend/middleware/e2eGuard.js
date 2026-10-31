const { getPool } = require('../utils/pool');

const { DEV_MODE } = require('../config/env');

const ENTITY_QUERIES = {
  doctor: 'SELECT username FROM doctors WHERE doctor_id = $1',
  clinic: 'SELECT username FROM clinics WHERE clinic_id = $1',
  clinic_manager: 'SELECT username FROM clinic_admins WHERE clinic_admin_id = $1',
  slot: `SELECT d.username FROM slots s JOIN doctors d ON d.doctor_id = s.doctor_id WHERE s.slot_id = $1`,
};

function e2eGuard(entityType, paramName) {
  return async (req, res, next) => {
    if (!DEV_MODE) return next();

    const ua = req.get('user-agent') || '';
    if (!ua.includes('Playwright')) return next();

    const entityId = req.params[paramName];
    if (!entityId) return next();

    const query = ENTITY_QUERIES[entityType];
    if (!query) return next();

    try {
      const { rows } = await getPool().query(query, [entityId]);
      if (rows.length === 0) return next();

      const username = rows[0].username || '';
      if (username.toLowerCase().startsWith('e2e')) return next();

      console.error(`[E2E Guard] BLOCKED: Playwright tried to ${req.method} ${entityType} ${entityId} (username: ${username}). Only e2e-prefixed entities can be mutated by tests.`);
      return res.status(403).json({
        error: `E2E safety: cannot modify ${entityType} "${username}" — only entities with e2e-prefixed usernames can be mutated by automated tests.`,
      });
    } catch (err) {
      console.error('[E2E Guard] Lookup failed:', err.message);
      return next();
    }
  };
}

function e2eSelfGuard() {
  return (req, res, next) => {
    if (!DEV_MODE) return next();

    const ua = req.get('user-agent') || '';
    if (!ua.includes('Playwright')) return next();

    const username = req.username || '';
    if (username.toLowerCase().startsWith('e2e')) return next();

    console.error(`[E2E Guard] BLOCKED: Playwright tried to ${req.method} ${req.path} as '${username}'. Only e2e-prefixed accounts can mutate data in tests.`);
    return res.status(403).json({
      error: `E2E safety: cannot mutate data as "${username}" — only e2e-prefixed accounts can perform mutations in automated tests.`,
    });
  };
}

module.exports = { e2eGuard, e2eSelfGuard };
