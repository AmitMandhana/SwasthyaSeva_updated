const supabase = require('../../db');
const { DOCTOR_FIELDS_WITH_NAMES, flattenDoctorNames } = require('../../queries/read/getDoctors');
const { getDoctorExtraQualifications } = require('../../queries/read/getDoctorExtraQualifications');
const { getExtraQualifications } = require('../../queries/read/getExtraQualifications');
const bcrypt = require('bcrypt');

/**
 * GET /api/doctor/profile
 * Returns the authenticated doctor's profile with resolved names.
 */
async function getProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select(DOCTOR_FIELDS_WITH_NAMES)
      .eq('doctor_id', req.doctorId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });

    const doc = flattenDoctorNames(data);

    // Fetch extra qualifications
    const eqRecords = await getDoctorExtraQualifications(doc.doctor_id);
    let extraQualifications = [];
    if (eqRecords.length > 0) {
      const allEq = await getExtraQualifications();
      const eqMap = new Map(allEq.map(q => [q.qualification_code, q.name]));
      extraQualifications = eqRecords.map(r => ({
        qualification_code: r.qualification_code,
        name: eqMap.get(r.qualification_code) ?? r.qualification_code,
      }));
    }

    const { password_hash, is_deleted, created_at, ...profile } = doc;
    return res.status(200).json({ profile: { ...profile, extra_qualifications: extraQualifications } });
  } catch (err) {
    console.error('[Doctor:Profile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/doctor/profile
 * Updates password and/or profile photo.
 * Body: { currentPassword?, newPassword?, pfp_link? }
 */
async function updateProfile(req, res) {
  const { currentPassword, newPassword, pfp_link } = req.body || {};

  if (!currentPassword && !newPassword && pfp_link === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nothing to update' });
  }

  try {
    // If changing password, verify current
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Bad Request', message: 'Both currentPassword and newPassword are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Bad Request', message: 'New password must be at least 6 characters' });
      }

      const { data: doc, error } = await supabase
        .from('doctors')
        .select('password_hash')
        .eq('doctor_id', req.doctorId)
        .maybeSingle();

      if (error) throw error;
      if (!doc) return res.status(404).json({ error: 'Not Found' });

      const match = await bcrypt.compare(currentPassword, doc.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Bad Request', message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const { error: updateErr } = await supabase
        .from('doctors')
        .update({ password_hash: newHash })
        .eq('doctor_id', req.doctorId);

      if (updateErr) throw updateErr;
    }

    // Update photo if provided
    if (pfp_link !== undefined) {
      const { error: pfpErr } = await supabase
        .from('doctors')
        .update({ pfp_link })
        .eq('doctor_id', req.doctorId);

      if (pfpErr) throw pfpErr;
    }

    return res.status(200).json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[Doctor:UpdateProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getProfile, updateProfile };
