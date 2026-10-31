const { createPatientInquiry } = require('../../queries/create/createPatientInquiry');
const { getClinicById } = require('../../queries/read/getClinics');

async function createPublicInquiry(req, res) {
  const { clinic_id, patient_name, patient_phone, symptom_text } = req.body || {};

  if (!clinic_id || !patient_name || !patient_phone) {
    return res.status(400).json({ error: 'Bad Request', message: 'clinic_id, patient_name, and patient_phone are required' });
  }

  const clinicId = Number(clinic_id);
  if (!Number.isInteger(clinicId) || clinicId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid clinic_id' });
  }

  try {
    const clinic = await getClinicById(clinicId);
    if (!clinic || clinic.is_deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Clinic not found' });
    }

    const inquiry = await createPatientInquiry({
      clinic_id: clinicId,
      patient_name: String(patient_name).trim().slice(0, 100),
      patient_phone: String(patient_phone).trim().slice(0, 20),
      symptom_text: symptom_text ? String(symptom_text).trim().slice(0, 500) : null,
      source: 'clinic_page',
    });

    return res.status(201).json({ message: 'Inquiry submitted successfully', inquiry_id: inquiry.inquiry_id });
  } catch (err) {
    console.error('[PublicInquiry] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { createPublicInquiry };
