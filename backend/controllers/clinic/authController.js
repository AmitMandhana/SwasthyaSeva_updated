const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateToken } = require('../../jwt');
const supabase = require('../../db');
const { createActiveToken } = require('../../queries/create/createActiveToken');
const { getActiveTokensByUser } = require('../../queries/read/getActiveTokens');
const { deleteActiveTokenById } = require('../../queries/delete/deleteActiveToken');
const { generateOTP } = require('../../utils/generateOTP');
const sendSMSOTP = require('../../utils/msg/sendSMSOTP');
const { storePendingLogin, getPendingLogin, updateLoginOTP, incrementLoginAttempts, deletePendingLogin } = require('../../utils/pendingLoginOTPs');
const { clinicAdmin: clinicAuth } = require('../../config/auth');

const CLINIC_DEVICE_LIMIT = clinicAuth.deviceLimit;
const CLINIC_TOKEN_EXPIRY = clinicAuth.tokenExpiry;
const CLINIC_TOKEN_EXPIRY_MS = clinicAuth.tokenExpiryMs;

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
}

async function storeTokenAndEnforceLimit(token, clinicAdminId, ip) {
  const expires_at = new Date(Date.now() + CLINIC_TOKEN_EXPIRY_MS);
  try {
    await createActiveToken({ token, role: 'clinic_admin', user_id: clinicAdminId, ip_address: ip, expires_at });
    const activeSessions = await getActiveTokensByUser('clinic_admin', clinicAdminId);
    if (activeSessions.length > CLINIC_DEVICE_LIMIT) {
      const toEvict = activeSessions.slice(0, activeSessions.length - CLINIC_DEVICE_LIMIT);
      for (const session of toEvict) {
        await deleteActiveTokenById(session.token_id);
      }
      console.log(`[ClinicAuth] Evicted ${toEvict.length} oldest session(s) for clinic_admin_id=${clinicAdminId}`);
    }
  } catch (tokenErr) {
    console.error('[ClinicAuth] Failed to manage active tokens:', tokenErr.message);
  }
}

async function clinicAdminLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Username and password are required' });
  }

  try {
    const { data: clinicAdmin, error } = await supabase
      .from('clinic_admins')
      .select('clinic_admin_id, clinic_id, username, name, phone, password_hash, is_deleted')
      .eq('username', username)
      .single();

    if (error || !clinicAdmin) {
      console.warn(`[ClinicAuth] Login attempt for non-existent username: ${username}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
    }

    if (clinicAdmin.is_deleted) {
      console.warn(`[ClinicAuth] Login attempt for deleted clinic admin: ${username}`);
      return res.status(403).json({ error: 'Forbidden', message: 'This account has been deactivated' });
    }

    const isValid = await bcrypt.compare(password, clinicAdmin.password_hash);
    if (!isValid) {
      console.warn(`[ClinicAuth] Invalid password for clinic admin: ${username}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
    }

    const loginId = `clinic_admin_${clinicAdmin.clinic_admin_id}_${crypto.randomBytes(8).toString('hex')}`;
    const tokenPayload = {
      role: 'clinic_admin',
      clinic_admin_id: clinicAdmin.clinic_admin_id,
      clinic_id: clinicAdmin.clinic_id,
      username: clinicAdmin.username,
      name: clinicAdmin.name,
    };

    const storeResult = storePendingLogin({ loginId, role: 'clinic_admin', phone: clinicAdmin.phone, tokenPayload });
    if (storeResult.error === 'cooldown') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Please wait before retrying', retryAfter: storeResult.retryAfter });
    }

    const otp = generateOTP(clinicAdmin.phone);
    updateLoginOTP(loginId, otp);
    await sendSMSOTP(otp, clinicAdmin.phone, clinicAdmin.name);

    console.log(`[ClinicAuth] Password verified, OTP sent for clinic admin: ${username} (ID: ${clinicAdmin.clinic_admin_id})`);
    return res.status(200).json({ requires_otp: true, loginId, phone_masked: maskPhone(clinicAdmin.phone) });
  } catch (err) {
    console.error('[ClinicAuth] Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'An error occurred during login' });
  }
}

async function clinicAdminVerifyLoginOTP(req, res) {
  const { loginId, otp } = req.body;

  if (!loginId || !otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId and otp are required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'clinic_admin') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired login session' });
    }

    if (String(pending.otp) !== String(otp)) {
      const remaining = incrementLoginAttempts(loginId);
      if (remaining <= 0) {
        return res.status(429).json({ error: 'Too Many Requests', message: 'Too many failed attempts. Please login again.' });
      }
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid OTP', attemptsRemaining: remaining });
    }

    deletePendingLogin(loginId);

    const token = generateToken(pending.tokenPayload, { expiresIn: CLINIC_TOKEN_EXPIRY });
    await storeTokenAndEnforceLimit(token, pending.tokenPayload.clinic_admin_id, req.ip);

    console.log(`[ClinicAuth] 2FA complete for clinic_admin_id=${pending.tokenPayload.clinic_admin_id}`);
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[ClinicAuth] OTP verify error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function clinicAdminResendLoginOTP(req, res) {
  const { loginId } = req.body;

  if (!loginId) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId is required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'clinic_admin') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired login session' });
    }

    if (pending.otpSentAt && Date.now() - pending.otpSentAt < 60 * 1000) {
      const retryAfter = Math.ceil((60 * 1000 - (Date.now() - pending.otpSentAt)) / 1000);
      return res.status(429).json({ error: 'Too Many Requests', message: 'Please wait before resending', retryAfter });
    }

    const otp = generateOTP(pending.phone);
    updateLoginOTP(loginId, otp);
    await sendSMSOTP(otp, pending.phone, pending.tokenPayload.name);

    console.log(`[ClinicAuth] OTP resent for loginId=${loginId}`);
    return res.status(200).json({ message: 'OTP resent' });
  } catch (err) {
    console.error('[ClinicAuth] Resend OTP error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { clinicAdminLogin, clinicAdminVerifyLoginOTP, clinicAdminResendLoginOTP };
