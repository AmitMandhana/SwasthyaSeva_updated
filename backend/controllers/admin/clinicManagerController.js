const bcrypt = require('bcrypt');
const { createClinicManager } = require('../../queries/create/createClinicManager');
const { getClinicManagers, getClinicManagerById } = require('../../queries/read/getClinicManagers');
const { updateClinicManager } = require('../../queries/update/updateClinicManager');
const { softDeleteClinicManager } = require('../../queries/delete/softDeleteClinicManager');
const { restoreClinicManager } = require('../../queries/update/restoreClinicManager');
const { generatePassword } = require('../../utils/generatePassword');
const validateWithSchema = require('../../validators/validator');
const createClinicManagerSchema = require('../../validators/schemas/createClinicManagerSchema');
const updateClinicManagerSchema = require('../../validators/schemas/updateClinicManagerSchema');

const BCRYPT_ROUNDS = 12;

/**
 * POST /api/admin/clinic-managers
 */
async function createClinicManagerHandler(req, res) {
  const body = req.body || {};

  // Schema validation (no PII encryption for admin entities)
  const { success, data, errors } = validateWithSchema(createClinicManagerSchema, body, { encryptPII: false });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  // Handle password: if provided, validate and hash; otherwise generate
  let temporaryPassword = null;
  if (data.password) {
    data.password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  } else {
    temporaryPassword = generatePassword(14);
    data.password_hash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
  }
  delete data.password;

  try {
    const manager = await createClinicManager(data);
    const response = { manager };
    if (temporaryPassword) response.temporaryPassword = temporaryPassword;
    console.log(`[ClinicManager Create] OK clinic_admin_id=${manager.clinic_admin_id} username="${manager.username}" clinic_id=${manager.clinic_id} by admin=${req.adminId}`);
    return res.status(201).json(response);
  } catch (err) {
    if (err.code === '23505') {
      console.warn(`[ClinicManager Create] CONFLICT username="${data.username}" clinic_id=${data.clinic_id} — duplicate | admin=${req.adminId}`);
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists for this clinic' });
    }
    if (err.code === '23503') {
      console.warn(`[ClinicManager Create] FK ERROR — invalid clinic_id=${data.clinic_id} | admin=${req.adminId}`);
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id: clinic not found' });
    }
    console.error('[ClinicManager Create] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/clinic-managers
 * Query: ?clinic_id=5&includeDeleted=true
 */
async function listClinicManagersHandler(req, res) {
  const includeDeleted = req.query.includeDeleted === 'true';
  const clinicId = req.query.clinic_id ? parseInt(req.query.clinic_id, 10) : null;

  if (req.query.clinic_id !== undefined && (!Number.isInteger(clinicId) || clinicId < 1)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }

  const { search, name, username, phone, clinic_username } = req.query;
  try {
    const managers = await getClinicManagers({ clinicId, includeDeleted, search, name, username, phone, clinic_username });
    return res.status(200).json({ managers });
  } catch (err) {
    console.error('[ClinicManager List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/admin/clinic-managers/search
 */
async function searchClinicManagersHandler(req, res) {
  const { clinicId, includeDeleted = false, filters = {} } = req.body || {};
  const { search, name, username, phone, clinic_username } = filters;
  
  if (clinicId !== undefined && (!Number.isInteger(clinicId) || clinicId < 1)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }
  
  try {
    const managers = await getClinicManagers({ clinicId, includeDeleted, search, name, username, phone, clinic_username });
    return res.status(200).json({ managers });
  } catch (err) {
    console.error('[ClinicManager Search]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/clinic-managers/:clinic_admin_id
 */
async function getClinicManagerHandler(req, res) {
  const id = parseInt(req.params.clinic_admin_id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_admin_id' });
  }
  try {
    const manager = await getClinicManagerById(id);
    if (!manager) {
      console.warn(`[ClinicManager Get] NOT FOUND clinic_admin_id=${id}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic manager not found' });
    }
    return res.status(200).json({ manager });
  } catch (err) {
    console.error('[ClinicManager Get] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/clinic-managers/:clinic_admin_id
 */
async function updateClinicManagerHandler(req, res) {
  const id = parseInt(req.params.clinic_admin_id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_admin_id' });
  }

  const body = req.body || {};
  delete body.username;

  // Schema validation with onlyPresent (partial update)
  const { success, data, errors } = validateWithSchema(updateClinicManagerSchema, body, { encryptPII: false, onlyPresent: true });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  // Handle password if present
  if (data.password) {
    data.password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    delete data.password;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided' });
  }

  try {
    const manager = await updateClinicManager(id, data);
    if (!manager) {
      console.warn(`[ClinicManager Update] NOT FOUND clinic_admin_id=${id}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic manager not found' });
    }
    console.log(`[ClinicManager Update] OK clinic_admin_id=${id} by admin=${req.adminId}`);
    return res.status(200).json({ manager });
  } catch (err) {
    if (err.code === '23505') {
      console.warn(`[ClinicManager Update] CONFLICT clinic_admin_id=${id} — duplicate username | admin=${req.adminId}`);
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists for this clinic' });
    }
    console.error('[ClinicManager Update] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/admin/clinic-managers/:clinic_admin_id
 */
async function deleteClinicManagerHandler(req, res) {
  const id = parseInt(req.params.clinic_admin_id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_admin_id' });
  }
  try {
    const deleted = await softDeleteClinicManager(id);
    if (!deleted) {
      console.warn(`[ClinicManager Delete] NOT FOUND clinic_admin_id=${id}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic manager not found or already deleted' });
    }
    console.log(`[ClinicManager Delete] OK clinic_admin_id=${id} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Clinic manager deleted successfully' });
  } catch (err) {
    console.error('[ClinicManager Delete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/clinic-managers/:clinic_admin_id/restore
 */
async function restoreClinicManagerHandler(req, res) {
  const id = parseInt(req.params.clinic_admin_id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_admin_id' });
  }

  try {
    const restored = await restoreClinicManager(id);
    if (!restored) {
      console.warn(`[ClinicManager Restore] NOT FOUND clinic_admin_id=${id}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic manager not found or not deleted' });
    }
    console.log(`[ClinicManager Restore] OK clinic_admin_id=${id} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Clinic manager restored successfully' });
  } catch (err) {
    console.error('[ClinicManager Restore] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  createClinicManagerHandler,
  listClinicManagersHandler,
  searchClinicManagersHandler,
  getClinicManagerHandler,
  updateClinicManagerHandler,
  deleteClinicManagerHandler,
  restoreClinicManagerHandler,
};
