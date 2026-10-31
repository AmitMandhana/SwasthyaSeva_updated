const bcrypt = require('bcrypt');
const { createDoctor } = require('../../queries/create/createDoctor');
const { getDoctors, getDoctorById } = require('../../queries/read/getDoctors');
const { updateDoctor } = require('../../queries/update/updateDoctor');
const { softDeleteDoctor } = require('../../queries/delete/softDeleteDoctor');
const { restoreDoctor } = require('../../queries/update/restoreDoctor');
const { generatePassword } = require('../../utils/generatePassword');
const validateWithSchema = require('../../validators/validator');
const createDoctorSchema = require('../../validators/schemas/createDoctorSchema');
const updateDoctorSchema = require('../../validators/schemas/updateDoctorSchema');

const BCRYPT_ROUNDS = 12;

/**
 * POST /api/admin/doctors
 * Body: doctor fields. Password optional — auto-generated if omitted.
 * Returns: { doctor, temporaryPassword? }
 */
async function createDoctorHandler(req, res) {
  const body = req.body || {};

  // Schema validation (no PII encryption for admin entities)
  const { success, data, errors } = validateWithSchema(createDoctorSchema, body, { encryptPII: false });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  if (!data.pfp_link) data.pfp_link = 'https://placehold.co/200x200?text=Doctor';
  if (!data.banner_link) data.banner_link = 'https://placehold.co/800x200?text=Banner';
  if (!data.signature_link) data.signature_link = 'https://placehold.co/400x100?text=Signature';

  // Handle password: if provided, validate and hash; otherwise generate
  let temporaryPassword = null;
  if (data.password) {
    data.password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  } else {
    temporaryPassword = generatePassword(14);
    data.password_hash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
  }
  
  // Always remove password field before DB insert
  delete data.password;

  try {
    const doctor = await createDoctor(data);
    const response = { doctor };
    if (temporaryPassword) response.temporaryPassword = temporaryPassword;
    console.log(`[Doctor Create] OK doctor_id=${doctor.doctor_id} username="${doctor.username}" by admin=${req.adminId}`);
    return res.status(201).json(response);
  } catch (err) {
    if (err.code === '23505') {
      console.warn(`[Doctor Create] CONFLICT username="${data.username}" — duplicate username/license | admin=${req.adminId}`);
      return res.status(409).json({ error: 'Conflict', message: 'Username or license number already exists' });
    }
    if (err.code === '23503') {
      console.warn(`[Doctor Create] FK ERROR — invalid specialization or tag code | admin=${req.adminId}`);
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid specialization or tag code' });
    }
    console.error('[Doctor Create] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/doctors
 * Query: ?includeDeleted=true
 */
async function listDoctorsHandler(req, res) {
  const includeDeleted = req.query.includeDeleted === 'true';
  const { search, username, name, phone } = req.query;
  try {
    const doctors = await getDoctors({ includeDeleted, search, username, name, phone });
    return res.status(200).json({ doctors });
  } catch (err) {
    console.error('[Doctor List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/admin/doctors/search
 * Body: { includeDeleted?: boolean, filters?: { username?: string, name?: string, phone?: string, search?: string } }
 */
async function searchDoctorsHandler(req, res) {
  const { includeDeleted = false, filters = {} } = req.body || {};
  const { username, name, phone, search } = filters;
  try {
    const doctors = await getDoctors({ includeDeleted, username, name, phone, search });
    return res.status(200).json({ doctors });
  } catch (err) {
    console.error('[Doctor Search]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/doctors/:doctor_id
 */
async function getDoctorHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  try {
    const doctor = await getDoctorById(doctorId);
    if (!doctor) {
      console.warn(`[Doctor Get] NOT FOUND doctor_id=${doctorId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
    }
    return res.status(200).json({ doctor });
  } catch (err) {
    console.error('[Doctor Get] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/doctors/:doctor_id
 */
async function updateDoctorHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  const body = req.body || {};

  // Schema validation with onlyPresent (partial update)
  const { success, data, errors } = validateWithSchema(updateDoctorSchema, body, { encryptPII: false, onlyPresent: true });
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
    const doctor = await updateDoctor(doctorId, data);
    if (!doctor) {
      console.warn(`[Doctor Update] NOT FOUND doctor_id=${doctorId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
    }
    console.log(`[Doctor Update] OK doctor_id=${doctorId} by admin=${req.adminId}`);
    return res.status(200).json({ doctor });
  } catch (err) {
    if (err.code === '23503') {
      console.warn(`[Doctor Update] FK ERROR doctor_id=${doctorId} — invalid specialization or tag code | admin=${req.adminId}`);
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid specialization or tag code' });
    }
    console.error('[Doctor Update] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/admin/doctors/:doctor_id
 */
async function deleteDoctorHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  try {
    const deleted = await softDeleteDoctor(doctorId);
    if (!deleted) {
      console.warn(`[Doctor Delete] NOT FOUND doctor_id=${doctorId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found or already deleted' });
    }
    console.log(`[Doctor Delete] OK doctor_id=${doctorId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error('[Doctor Delete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/doctors/:doctor_id/restore
 */
async function restoreDoctorHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  try {
    const restored = await restoreDoctor(doctorId);
    if (!restored) {
      console.warn(`[Doctor Restore] NOT FOUND doctor_id=${doctorId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Doctor not found or not deleted' });
    }
    console.log(`[Doctor Restore] OK doctor_id=${doctorId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Doctor restored successfully' });
  } catch (err) {
    console.error('[Doctor Restore] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  createDoctorHandler,
  listDoctorsHandler,
  searchDoctorsHandler,
  getDoctorHandler,
  updateDoctorHandler,
  deleteDoctorHandler,
  restoreDoctorHandler,
};
