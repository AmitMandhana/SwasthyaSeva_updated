const { createSlot } = require('../../queries/create/createSlot');
const { updateSlot } = require('../../queries/update/updateSlot');
const { deleteSlot } = require('../../queries/delete/deleteSlot');
const { restoreSlot } = require('../../queries/update/restoreSlot');
const supabase = require('../../db');

async function createClinicSlot(req, res) {
  const { doctor_id, slot_fee, booking_fee, slot_day, slot_start, slot_end } = req.body || {};

  const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const issues = [];
  const feeNum = parseInt(slot_fee, 10);
  const bookingFeeNum = parseInt(booking_fee, 10) || 0;
  const startNum = parseInt(slot_start, 10);
  const endNum = parseInt(slot_end, 10);

  if (!doctor_id || !Number.isInteger(parseInt(doctor_id, 10))) issues.push({ field: 'doctor_id', message: 'doctor_id is required' });
  if (!Number.isInteger(feeNum) || feeNum < 1) issues.push({ field: 'slot_fee', message: 'Must be a positive integer' });
  if (!slot_day || !VALID_DAYS.includes(String(slot_day).toUpperCase())) issues.push({ field: 'slot_day', message: `Must be one of: ${VALID_DAYS.join(', ')}` });
  if (!Number.isInteger(startNum) || startNum < 0 || startNum > 46) issues.push({ field: 'slot_start', message: 'Must be between 0 and 46' });
  if (!Number.isInteger(endNum) || endNum <= startNum || endNum > 47) issues.push({ field: 'slot_end', message: 'Must be between slot_start + 1 and 47' });

  if (issues.length > 0) return res.status(400).json({ error: 'Validation failed', issues });

  try {
    const slot = await createSlot({
      doctor_id: parseInt(doctor_id, 10),
      clinic_id: req.clinicId,
      slot_fee: feeNum,
      booking_fee: bookingFeeNum,
      slot_day: slot_day.toUpperCase(),
      slot_start: startNum,
      slot_end: endNum,
    });
    console.log(`[Clinic:Slot] CREATED slot_id=${slot.slot_id} clinic_id=${req.clinicId}`);
    return res.status(201).json({ slot });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
    if (err.code === '23514') return res.status(400).json({ error: 'Bad Request', message: 'Slot constraints violated' });
    console.error('[Clinic:Slot] Create error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function updateClinicSlot(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!slotId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });

  // Verify ownership
  const { data: existing } = await supabase.from('slots').select('clinic_id').eq('slot_id', slotId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not Found' });
  if (existing.clinic_id !== req.clinicId) return res.status(403).json({ error: 'Forbidden', message: 'Not your slot' });

  const updates = {};
  const { slot_fee, booking_fee, slot_day, slot_start, slot_end, watermark_url } = req.body || {};
  if (slot_fee !== undefined) updates.slot_fee = parseInt(slot_fee, 10);
  if (booking_fee !== undefined) updates.booking_fee = parseInt(booking_fee, 10);
  if (slot_day !== undefined) updates.slot_day = slot_day.toUpperCase();
  if (slot_start !== undefined) updates.slot_start = parseInt(slot_start, 10);
  if (slot_end !== undefined) updates.slot_end = parseInt(slot_end, 10);
  if (watermark_url !== undefined) updates.watermark_url = watermark_url || null;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Bad Request', message: 'No fields to update' });

  try {
    const slot = await updateSlot(slotId, updates);
    if (!slot) return res.status(404).json({ error: 'Not Found' });
    console.log(`[Clinic:Slot] UPDATED slot_id=${slotId} clinic_id=${req.clinicId}`);
    return res.status(200).json({ slot });
  } catch (err) {
    console.error('[Clinic:Slot] Update error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function deleteClinicSlot(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!slotId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });

  const { data: existing } = await supabase.from('slots').select('clinic_id').eq('slot_id', slotId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not Found' });
  if (existing.clinic_id !== req.clinicId) return res.status(403).json({ error: 'Forbidden', message: 'Not your slot' });

  try {
    await deleteSlot(slotId);
    console.log(`[Clinic:Slot] DELETED slot_id=${slotId} clinic_id=${req.clinicId}`);
    return res.status(200).json({ message: 'Slot deleted' });
  } catch (err) {
    console.error('[Clinic:Slot] Delete error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function restoreClinicSlot(req, res) {
  const slotId = parseInt(req.params.slot_id, 10);
  if (!slotId) return res.status(400).json({ error: 'Bad Request', message: 'Invalid slot_id' });

  const { data: existing } = await supabase.from('slots').select('clinic_id').eq('slot_id', slotId).maybeSingle();
  if (!existing) return res.status(404).json({ error: 'Not Found' });
  if (existing.clinic_id !== req.clinicId) return res.status(403).json({ error: 'Forbidden', message: 'Not your slot' });

  try {
    await restoreSlot(slotId);
    console.log(`[Clinic:Slot] RESTORED slot_id=${slotId} clinic_id=${req.clinicId}`);
    return res.status(200).json({ message: 'Slot restored' });
  } catch (err) {
    console.error('[Clinic:Slot] Restore error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { createClinicSlot, updateClinicSlot, deleteClinicSlot, restoreClinicSlot };
