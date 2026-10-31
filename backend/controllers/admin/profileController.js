const supabase = require('../../db');
const bcrypt = require('bcrypt');

/**
 * GET /api/admin/profile
 * Returns admin username.
 */
async function getProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('admin_id, username')
      .eq('admin_id', req.adminId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'Admin not found' });

    return res.status(200).json({ profile: data });
  } catch (err) {
    console.error('[Admin:Profile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/admin/profile
 * Updates admin password.
 * Body: { currentPassword, newPassword }
 */
async function updateProfile(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Bad Request', message: 'Both currentPassword and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Bad Request', message: 'New password must be at least 6 characters' });
  }

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('password_hash')
      .eq('admin_id', req.adminId)
      .maybeSingle();

    if (error) throw error;
    if (!admin) return res.status(404).json({ error: 'Not Found' });

    const match = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Bad Request', message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const { error: updateErr } = await supabase
      .from('admins')
      .update({ password_hash: newHash })
      .eq('admin_id', req.adminId);

    if (updateErr) throw updateErr;

    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    console.error('[Admin:UpdateProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getProfile, updateProfile };
