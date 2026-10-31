const bcrypt = require('bcrypt');
const { createClinic } = require('../../queries/create/createClinic');
const { getClinics, getClinicById } = require('../../queries/read/getClinics');
const { updateClinic } = require('../../queries/update/updateClinic');
const { softDeleteClinic } = require('../../queries/delete/softDeleteClinic');
const { restoreClinic } = require('../../queries/update/restoreClinic');
const { generatePassword } = require('../../utils/generatePassword');
const validateWithSchema = require('../../validators/validator');
const createClinicSchema = require('../../validators/schemas/createClinicSchema');
const updateClinicSchema = require('../../validators/schemas/updateClinicSchema');

const BCRYPT_ROUNDS = 12;

/**
 * POST /api/admin/clinics
 */
async function createClinicHandler(req, res) {
  const body = req.body || {};

  // Schema validation (no PII encryption for admin entities)
  const { success, data, errors } = validateWithSchema(createClinicSchema, body, { encryptPII: false });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  if (!data.pfp_link) data.pfp_link = 'https://placehold.co/200x200?text=Clinic';
  if (!data.banner_link) data.banner_link = 'https://placehold.co/800x200?text=Banner';
  if (!data.state) data.state = 'West Bengal';
  if (!data.pincode) data.pincode = '700001';
  if (!data.location_x) data.location_x = 88.3639;
  if (!data.location_y) data.location_y = 22.5726;
  if (!data.country) data.country = 'India';
  if (!data.pincode) data.pincode = '700001';

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
    const clinic = await createClinic(data);
    const response = { clinic };
    if (temporaryPassword) response.temporaryPassword = temporaryPassword;
    console.log(`[Clinic Create] OK clinic_id=${clinic.clinic_id} name="${clinic.clinic_name ?? ''}" by admin=${req.adminId}`);
    return res.status(201).json(response);
  } catch (err) {
    if (err.code === '23505') {
      console.warn(`[Clinic Create] CONFLICT username="${data.username}" — duplicate | admin=${req.adminId}`);
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists' });
    }
    console.error('[Clinic Create] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/clinics
 */
async function listClinicsHandler(req, res) {
  const includeDeleted = req.query.includeDeleted === 'true';
  const { search, name, phone, city, state } = req.query;
  try {
    const clinics = await getClinics({ includeDeleted, search, name, phone, city, state });
    return res.status(200).json({ clinics });
  } catch (err) {
    console.error('[Clinic List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/admin/clinics/search
 */
async function searchClinicsHandler(req, res) {
  const { includeDeleted = false, filters = {} } = req.body || {};
  const { search, username, name, phone, city, state } = filters;
  try {
    const clinics = await getClinics({ includeDeleted, search, username, name, phone, city, state });
    return res.status(200).json({ clinics });
  } catch (err) {
    console.error('[Clinic Search]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/clinics/:clinic_id
 */
async function getClinicHandler(req, res) {
  const clinicId = parseInt(req.params.clinic_id, 10);
  if (!Number.isInteger(clinicId) || clinicId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }
  try {
    const clinic = await getClinicById(clinicId);
    if (!clinic) {
      console.warn(`[Clinic Get] NOT FOUND clinic_id=${clinicId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found' });
    }
    return res.status(200).json({ clinic });
  } catch (err) {
    console.error('[Clinic Get] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/clinics/:clinic_id
 */
async function updateClinicHandler(req, res) {
  const clinicId = parseInt(req.params.clinic_id, 10);
  if (!Number.isInteger(clinicId) || clinicId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }

  const body = req.body || {};

  // Schema validation with onlyPresent (partial update)
  const { success, data, errors } = validateWithSchema(updateClinicSchema, body, { encryptPII: false, onlyPresent: true });
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
    const clinic = await updateClinic(clinicId, data);
    if (!clinic) {
      console.warn(`[Clinic Update] NOT FOUND clinic_id=${clinicId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found' });
    }
    console.log(`[Clinic Update] OK clinic_id=${clinicId} by admin=${req.adminId}`);
    return res.status(200).json({ clinic });
  } catch (err) {
    console.error('[Clinic Update] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/admin/clinics/:clinic_id
 */
async function deleteClinicHandler(req, res) {
  const clinicId = parseInt(req.params.clinic_id, 10);
  if (!Number.isInteger(clinicId) || clinicId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }
  try {
    const deleted = await softDeleteClinic(clinicId);
    if (!deleted) {
      console.warn(`[Clinic Delete] NOT FOUND clinic_id=${clinicId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found or already deleted' });
    }
    console.log(`[Clinic Delete] OK clinic_id=${clinicId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Clinic deleted successfully' });
  } catch (err) {
    console.error('[Clinic Delete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/clinics/:clinic_id/restore
 */
async function restoreClinicHandler(req, res) {
  const clinicId = parseInt(req.params.clinic_id, 10);
  if (!Number.isInteger(clinicId) || clinicId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }

  try {
    const restored = await restoreClinic(clinicId);
    if (!restored) {
      console.warn(`[Clinic Restore] NOT FOUND clinic_id=${clinicId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found or not deleted' });
    }
    console.log(`[Clinic Restore] OK clinic_id=${clinicId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Clinic restored successfully' });
  } catch (err) {
    console.error('[Clinic Restore] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  createClinicHandler,
  listClinicsHandler,
  searchClinicsHandler,
  getClinicHandler,
  updateClinicHandler,
  deleteClinicHandler,
  restoreClinicHandler,
};
