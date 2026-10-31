const bcrypt = require('bcrypt');
const { createClinicManager } = require('../../queries/create/createClinicManager');
const { getClinicManagers, getClinicManagerById } = require('../../queries/read/getClinicManagers');
const { updateClinicManager } = require('../../queries/update/updateClinicManager');
const { softDeleteClinicManager } = require('../../queries/delete/softDeleteClinicManager');
const { restoreClinicManager } = require('../../queries/update/restoreClinicManager');
const { generatePassword } = require('../../utils/generatePassword');

const BCRYPT_ROUNDS = 12;

/**
 * Verify target clinic admin belongs to the authenticated clinic.
 */
async function verifyOwnership(id, clinicId) {
  const manager = await getClinicManagerById(id);
  if (!manager) return null;
  if (manager.clinic_id !== clinicId) return false;
  return manager;
}

async function listClinicAdmins(req, res) {
  const includeDeleted = req.query.includeDeleted === 'true';
  const { search, name, username, phone } = req.query;
  try {
    const managers = await getClinicManagers({
      clinicId: req.clinicId,
      includeDeleted,
      search, name, username, phone,
    });
    return res.status(200).json({ managers });
  } catch (err) {
    console.error('[Clinic:AdminList] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function createClinicAdmin(req, res) {
  const { name, username, phone, password, pfp_link } = req.body || {};

  if (!name || !username || !phone) {
    return res.status(400).json({ error: 'Bad Request', message: 'name, username, and phone are required' });
  }

  let temporaryPassword = null;
  let password_hash;
  if (password && password.length >= 8) {
    password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  } else {
    temporaryPassword = generatePassword(14);
    password_hash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
  }

  try {
    const manager = await createClinicManager({
      clinic_id: req.clinicId,
      name, username, phone, password_hash,
      pfp_link: pfp_link || null,
    });
    const response = { manager };
    if (temporaryPassword) response.temporaryPassword = temporaryPassword;
    console.log(`[Clinic:AdminCreate] OK clinic_admin_id=${manager.clinic_admin_id} username="${username}" by clinic=${req.clinicId}`);
    return res.status(201).json(response);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists for this clinic' });
    }
    console.error('[Clinic:AdminCreate] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function updateClinicAdmin(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
  }

  const ownership = await verifyOwnership(id, req.clinicId);
  if (ownership === null) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found' });
  if (ownership === false) return res.status(403).json({ error: 'Forbidden', message: 'Cannot modify another clinic\'s admin' });

  const { name, phone, password, pfp_link } = req.body || {};
  const data = {};
  if (name) data.name = name;
  if (phone) data.phone = phone;
  if (pfp_link !== undefined) data.pfp_link = pfp_link;
  if (password && password.length >= 8) {
    data.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided' });
  }

  try {
    const manager = await updateClinicManager(id, data);
    if (!manager) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found' });
    console.log(`[Clinic:AdminUpdate] OK clinic_admin_id=${id} by clinic=${req.clinicId}`);
    return res.status(200).json({ manager });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists for this clinic' });
    }
    console.error('[Clinic:AdminUpdate] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function deleteClinicAdmin(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
  }

  const ownership = await verifyOwnership(id, req.clinicId);
  if (ownership === null) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found' });
  if (ownership === false) return res.status(403).json({ error: 'Forbidden', message: 'Cannot delete another clinic\'s admin' });

  try {
    const deleted = await softDeleteClinicManager(id);
    if (!deleted) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found or already deleted' });
    console.log(`[Clinic:AdminDelete] OK clinic_admin_id=${id} by clinic=${req.clinicId}`);
    return res.status(200).json({ message: 'Clinic admin deleted successfully' });
  } catch (err) {
    console.error('[Clinic:AdminDelete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function restoreClinicAdmin(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
  }

  const ownership = await verifyOwnership(id, req.clinicId);
  if (ownership === null) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found' });
  if (ownership === false) return res.status(403).json({ error: 'Forbidden', message: 'Cannot restore another clinic\'s admin' });

  try {
    const restored = await restoreClinicManager(id);
    if (!restored) return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found or not deleted' });
    console.log(`[Clinic:AdminRestore] OK clinic_admin_id=${id} by clinic=${req.clinicId}`);
    return res.status(200).json({ message: 'Clinic admin restored successfully' });
  } catch (err) {
    console.error('[Clinic:AdminRestore] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listClinicAdmins, createClinicAdmin, updateClinicAdmin, deleteClinicAdmin, restoreClinicAdmin };
