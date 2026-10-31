const { createSlot } = require('../../queries/create/createSlot');
const { getSlots, getSlotById } = require('../../queries/read/getSlots');
const { getDoctorByUsername } = require('../../queries/read/getDoctorByUsername');
const { getClinicByUsername } = require('../../queries/read/getClinicByUsername');
const { updateSlot } = require('../../queries/update/updateSlot');
const { restoreSlot } = require('../../queries/update/restoreSlot');
const { deleteSlot } = require('../../queries/delete/deleteSlot');
const validateWithSchema = require('../../validators/validator');
const updateSlotSchema = require('../../validators/schemas/updateSlotSchema');

/**
 * POST /api/admin/slots
 * Body: { doctor_username, clinic_username, slot_fee, slot_day, slot_start, slot_end }
 * Resolves usernames to IDs before inserting.
 */
async function createSlotHandler(req, res) {
  const { doctor_username, clinic_username, slot_fee, booking_fee, slot_day, slot_start, slot_end } = req.body || {};

  // Validate required string fields
  if (!doctor_username || typeof doctor_username !== 'string' || !doctor_username.trim()) {
    return res.status(400).json({ error: 'Validation failed', issues: [{ field: 'doctor_username', message: 'doctor_username is required' }] });
  }
  if (!clinic_username || typeof clinic_username !== 'string' || !clinic_username.trim()) {
    return res.status(400).json({ error: 'Validation failed', issues: [{ field: 'clinic_username', message: 'clinic_username is required' }] });
  }

  // Validate numeric/enum fields using existing field validators inline
  const issues = [];
  const feeNum = parseInt(slot_fee, 10);
  const startNum = parseInt(slot_start, 10);
  const endNum = parseInt(slot_end, 10);
  const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  if (!Number.isInteger(feeNum) || feeNum < 1) issues.push({ field: 'slot_fee', message: 'Must be a positive integer' });
  if (!slot_day || !VALID_DAYS.includes(String(slot_day).toUpperCase())) issues.push({ field: 'slot_day', message: `Must be one of: ${VALID_DAYS.join(', ')}` });
  if (!Number.isInteger(startNum) || startNum < 0 || startNum > 46) issues.push({ field: 'slot_start', message: 'Must be between 0 and 46' });
  if (!Number.isInteger(endNum) || endNum <= startNum || endNum > 47) issues.push({ field: 'slot_end', message: 'Must be between slot_start + 1 and 47' });

  if (issues.length > 0) return res.status(400).json({ error: 'Validation failed', issues });

  try {
    // Resolve usernames → IDs
    const doctor = await getDoctorByUsername(doctor_username.trim());
    if (!doctor) {
      return res.status(404).json({ error: 'Not Found', message: `Doctor with username "${doctor_username.trim()}" not found` });
    }
    const clinic = await getClinicByUsername(clinic_username.trim());
    if (!clinic) {
      return res.status(404).json({ error: 'Not Found', message: `Clinic with username "${clinic_username.trim()}" not found` });
    }

    const bookingFeeNum = parseInt(booking_fee, 10) || 0;
    const slot = await createSlot({
      doctor_id: doctor.doctor_id,
      clinic_id: clinic.clinic_id,
      slot_fee: feeNum,
      booking_fee: bookingFeeNum,
      slot_day: slot_day.toUpperCase(),
      slot_start: startNum,
      slot_end: endNum,
    });
    console.log(`[Slot Create] OK slot_id=${slot.slot_id} doctor="${doctor_username}" clinic="${clinic_username}" by admin=${req.adminId}`);
    return res.status(201).json({ slot });
  } catch (err) {
    if (err.code === '23514') {
      console.warn(`[Slot Create] CHECK ERROR — constraint violated | admin=${req.adminId}`);
      return res.status(400).json({ error: 'Bad Request', message: 'Slot time constraints violated' });
    }
    console.error('[Slot Create] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/slots
 * Query: ?clinic_username=x&doctor_username=y&day=MON&tag=PED&includeDeleted=true
 */
async function listSlotsHandler(req, res) {
  const { clinic_username, doctor_username, day, tag, includeDeleted } = req.query;
  try {
    const slots = await getSlots({
      includeDeleted: includeDeleted === 'true',
      clinic_username: clinic_username || undefined,
      doctor_username: doctor_username || undefined,
      day: day || undefined,
      tag: tag || undefined,
    });
    return res.status(200).json({ slots });
  } catch (err) {
    console.error('[Slot List]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/slots/:slot_id
 */
async function getSlotHandler(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!Number.isInteger(slotId) || slotId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });
  }

  try {
    const slot = await getSlotById(slotId);
    if (!slot) {
      console.warn(`[Slot Get] NOT FOUND slot_id=${slotId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Slot not found' });
    }
    return res.status(200).json({ slot });
  } catch (err) {
    console.error('[Slot Get] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/slots/:slot_id
 */
async function updateSlotHandler(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!Number.isInteger(slotId) || slotId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });
  }

  const body = req.body || {};
  const { success, data, errors } = validateWithSchema(updateSlotSchema, body, { encryptPII: false, onlyPresent: true });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided' });
  }

  try {
    const slot = await updateSlot(slotId, data);
    if (!slot) {
      console.warn(`[Slot Update] NOT FOUND slot_id=${slotId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Slot not found' });
    }
    console.log(`[Slot Update] OK slot_id=${slotId} by admin=${req.adminId}`);
    return res.status(200).json({ slot });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id or clinic_id' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Bad Request', message: 'Slot time constraints violated' });
    }
    console.error('[Slot Update] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/admin/slots/:slot_id — soft delete
 */
async function deleteSlotHandler(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!Number.isInteger(slotId) || slotId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });
  }

  try {
    const deleted = await deleteSlot(slotId);
    if (!deleted) {
      console.warn(`[Slot Delete] NOT FOUND slot_id=${slotId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Slot not found or already deleted' });
    }
    console.log(`[Slot Delete] OK (soft) slot_id=${slotId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Slot deleted successfully' });
  } catch (err) {
    console.error('[Slot Delete] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/slots/:slot_id/restore
 */
async function restoreSlotHandler(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!Number.isInteger(slotId) || slotId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });
  }

  try {
    const restored = await restoreSlot(slotId);
    if (!restored) {
      console.warn(`[Slot Restore] NOT FOUND slot_id=${slotId}`);
      return res.status(404).json({ error: 'Not Found', message: 'Slot not found or not deleted' });
    }
    console.log(`[Slot Restore] OK slot_id=${slotId} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Slot restored successfully' });
  } catch (err) {
    console.error('[Slot Restore] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  createSlotHandler,
  listSlotsHandler,
  getSlotHandler,
  updateSlotHandler,
  deleteSlotHandler,
  restoreSlotHandler,
};
