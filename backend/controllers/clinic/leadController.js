const { createPatientInquiry } = require('../../queries/create/createPatientInquiry');
const { getPatientInquiries } = require('../../queries/read/getPatientInquiries');
const { updatePatientInquiry } = require('../../queries/update/updatePatientInquiry');

async function listLeads(req, res) {
  try {
    const { status, source, search, limit, offset } = req.query;
    const result = await getPatientInquiries({
      clinicId: req.clinicId,
      status: status || undefined,
      source: source || undefined,
      search: search || undefined,
      limit: limit ? Math.min(Number(limit), 100) : 50,
      offset: offset ? Number(offset) : 0,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[ClinicLeads:List] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function createLead(req, res) {
  const { patient_name, patient_phone, symptom_text, source, notes, slot_id } = req.body || {};

  if (!patient_name || !patient_phone) {
    return res.status(400).json({ error: 'Bad Request', message: 'patient_name and patient_phone are required' });
  }

  const validSources = ['slot_search', 'clinic_page', 'phone', 'walkin', 'other'];
  if (source && !validSources.includes(source)) {
    return res.status(400).json({ error: 'Bad Request', message: `source must be one of: ${validSources.join(', ')}` });
  }

  try {
    const inquiry = await createPatientInquiry({
      clinic_id: req.clinicId,
      patient_name,
      patient_phone,
      symptom_text: symptom_text || null,
      source: source || 'other',
      notes: notes || null,
      slot_id: slot_id || null,
    });
    return res.status(201).json({ inquiry });
  } catch (err) {
    console.error('[ClinicLeads:Create] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function updateLead(req, res) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
  }

  const { status, notes } = req.body || {};
  const updates = {};

  if (status) {
    const validStatuses = ['new', 'contacted', 'booked', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Bad Request', message: `status must be one of: ${validStatuses.join(', ')}` });
    }
    updates.status = status;
  }
  if (notes !== undefined) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'No updatable fields provided' });
  }

  try {
    const inquiry = await updatePatientInquiry(id, req.clinicId, updates);
    if (!inquiry) {
      return res.status(404).json({ error: 'Not Found', message: 'Inquiry not found' });
    }
    return res.status(200).json({ inquiry });
  } catch (err) {
    console.error('[ClinicLeads:Update] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { listLeads, createLead, updateLead };
