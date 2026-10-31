const supabase = require('../../db');
const { decrypt } = require('../../utils/pii');
const bcrypt = require('bcrypt');

function tryDecrypt(val) {
  try { return val ? decrypt(val) : null; } catch { return val; }
}

/**
 * GET /api/patient/profile
 * Returns the authenticated patient's profile with decrypted PII.
 */
async function getProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, phone, email, dob, gender, pfp_link, street_address, city, state, country, occupation')
      .eq('user_id', req.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

    const profile = {
      user_id: data.user_id,
      first_name: tryDecrypt(data.first_name),
      last_name: tryDecrypt(data.last_name),
      phone: tryDecrypt(data.phone),
      email: tryDecrypt(data.email),
      dob: data.dob,
      gender: data.gender,
      pfp_link: data.pfp_link,
      city: data.city,
      state: data.state,
      country: data.country,
      occupation: data.occupation || null,
    };

    return res.status(200).json({ profile });
  } catch (err) {
    console.error('[Patient:Profile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * PATCH /api/patient/profile
 * Updates password and/or profile photo.
 * Body: { currentPassword?, newPassword?, pfp_link? }
 */
async function updateProfile(req, res) {
  const { currentPassword, newPassword, pfp_link, occupation } = req.body || {};

  if (!currentPassword && !newPassword && pfp_link === undefined && occupation === undefined) {
    return res.status(400).json({ error: 'Bad Request', message: 'Nothing to update' });
  }

  try {
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Bad Request', message: 'Both currentPassword and newPassword are required' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Bad Request', message: 'New password must be at least 6 characters' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('password_hash')
        .eq('user_id', req.userId)
        .maybeSingle();

      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Not Found' });

      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Bad Request', message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('user_id', req.userId);

      if (updateErr) throw updateErr;
    }

    if (pfp_link !== undefined) {
      const { error: pfpErr } = await supabase
        .from('users')
        .update({ pfp_link })
        .eq('user_id', req.userId);

      if (pfpErr) throw pfpErr;
    }

    if (occupation !== undefined) {
      const { error: occErr } = await supabase
        .from('users')
        .update({ occupation: occupation || null })
        .eq('user_id', req.userId);

      if (occErr) throw occErr;
    }

    return res.status(200).json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[Patient:UpdateProfile] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { getProfile, updateProfile };
