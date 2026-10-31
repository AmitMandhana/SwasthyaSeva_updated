const { createDoctorExtraQualification } = require('../../queries/create/createDoctorExtraQualification');
const { getDoctorExtraQualifications } = require('../../queries/read/getDoctorExtraQualifications');
const { deleteDoctorExtraQualification } = require('../../queries/delete/deleteDoctorExtraQualification');

/**
 * POST /api/admin/doctors/:doctor_id/extra-qualifications
 */
async function addDoctorExtraQualificationHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  const { qualification_code } = req.body || {};
  if (!qualification_code || typeof qualification_code !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'qualification_code is required' });
  }

  try {
    const qualification = await createDoctorExtraQualification({ doctor_id: doctorId, qualification_code });
    console.log(`[DoctorExtraQual Add] OK doctor_id=${doctorId} qual=${qualification_code} by admin=${req.adminId}`);
    return res.status(201).json({ qualification });
  } catch (err) {
    if (err.code === '23505') {
      console.warn(`[DoctorExtraQual Add] CONFLICT doctor_id=${doctorId} qual=${qualification_code} — duplicate`);
      return res.status(409).json({ error: 'Conflict', message: 'This qualification is already added for this doctor' });
    }
    if (err.code === '23503') {
      console.warn(`[DoctorExtraQual Add] FK ERROR doctor_id=${doctorId} or qual=${qualification_code} not found`);
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id or qualification_code' });
    }
    console.error('[DoctorExtraQual Add] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * GET /api/admin/doctors/:doctor_id/extra-qualifications
 */
async function listDoctorExtraQualificationsHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }

  try {
    const qualifications = await getDoctorExtraQualifications(doctorId);
    return res.status(200).json({ qualifications });
  } catch (err) {
    console.error('[DoctorExtraQual List] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * DELETE /api/admin/doctors/:doctor_id/extra-qualifications/:qualification_code
 */
async function removeDoctorExtraQualificationHandler(req, res) {
  const doctorId = parseInt(req.params.doctor_id, 10);
  const qualificationCode = req.params.qualification_code;

  if (!Number.isInteger(doctorId) || doctorId < 1) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid doctor_id' });
  }
  if (!qualificationCode) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid qualification_code' });
  }

  try {
    const deleted = await deleteDoctorExtraQualification(doctorId, qualificationCode);
    if (!deleted) {
      console.warn(`[DoctorExtraQual Remove] NOT FOUND doctor_id=${doctorId} qual=${qualificationCode}`);
      return res.status(404).json({ error: 'Not Found', message: 'Qualification not found for this doctor' });
    }
    console.log(`[DoctorExtraQual Remove] OK doctor_id=${doctorId} qual=${qualificationCode} by admin=${req.adminId}`);
    return res.status(200).json({ message: 'Qualification removed successfully' });
  } catch (err) {
    console.error('[DoctorExtraQual Remove] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  addDoctorExtraQualificationHandler,
  listDoctorExtraQualificationsHandler,
  removeDoctorExtraQualificationHandler,
};
