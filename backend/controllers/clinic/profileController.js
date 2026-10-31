const { getClinicById } = require('../../queries/read/getClinics');
const { getClinicManagerById } = require('../../queries/read/getClinicManagers');

async function getProfile(req, res) {
  try {
    if (req.role === 'clinic') {
      const clinic = await getClinicById(req.clinicId);
      if (!clinic) {
        return res.status(404).json({ error: 'Not Found', message: 'Clinic not found' });
      }
      const { password_hash, ...profile } = clinic;
      return res.status(200).json({ role: 'clinic', profile });
    }

    // clinic_admin
    const admin = await getClinicManagerById(req.clinicAdminId);
    if (!admin) {
      return res.status(404).json({ error: 'Not Found', message: 'Clinic admin not found' });
    }
    const clinic = await getClinicById(req.clinicId);
    const { password_hash, ...adminProfile } = admin;
    return res.status(200).json({
      role: 'clinic_admin',
      profile: adminProfile,
      clinic_name: clinic?.clinic_name ?? null,
    });
  } catch (err) {
    console.error('[ClinicProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

const supabase = require('../../db');
const bcrypt = require('bcrypt');

/**
 * PATCH /api/clinic/profile
 * Updates password and/or profile photo for clinic or clinic_admin.
 * Body: { currentPassword?, newPassword?, pfp_link? }
 */
async function updateProfile(req, res) {
  const { currentPassword, newPassword, pfp_link } = req.body || {};

  if (!currentPassword && !newPassword && pfp_link === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nothing to update' });
  }

  try {
    const table = req.role === 'clinic' ? 'clinics' : 'clinic_admins';
    const idColumn = req.role === 'clinic' ? 'clinic_id' : 'clinic_admin_id';
    const idValue = req.role === 'clinic' ? req.clinicId : req.clinicAdminId;

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Bad Request', message: 'Both currentPassword and newPassword are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Bad Request', message: 'New password must be at least 6 characters' });
      }

      const { data: record, error } = await supabase
        .from(table)
        .select('password_hash')
        .eq(idColumn, idValue)
        .maybeSingle();

      if (error) throw error;
      if (!record) return res.status(404).json({ error: 'Not Found' });

      const match = await bcrypt.compare(currentPassword, record.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Bad Request', message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const { error: updateErr } = await supabase
        .from(table)
        .update({ password_hash: newHash })
        .eq(idColumn, idValue);

      if (updateErr) throw updateErr;
    }

    if (pfp_link !== undefined) {
      const { error: pfpErr } = await supabase
        .from(table)
        .update({ pfp_link })
        .eq(idColumn, idValue);

      if (pfpErr) throw pfpErr;
    }

    return res.status(200).json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[ClinicUpdateProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getProfile, updateProfile };
