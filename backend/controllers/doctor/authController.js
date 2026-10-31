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
const { doctor: doctorAuth } = require('../../config/auth');

const DOCTOR_DEVICE_LIMIT = doctorAuth.deviceLimit;
const DOCTOR_TOKEN_EXPIRY = doctorAuth.tokenExpiry;
const DOCTOR_TOKEN_EXPIRY_MS = doctorAuth.tokenExpiryMs;

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
}

async function storeTokenAndEnforceLimit(token, doctorId, ip) {
  const expires_at = new Date(Date.now() + DOCTOR_TOKEN_EXPIRY_MS);
  try {
    await createActiveToken({ token, role: 'doctor', user_id: doctorId, ip_address: ip, expires_at });
    const activeSessions = await getActiveTokensByUser('doctor', doctorId);
    if (activeSessions.length > DOCTOR_DEVICE_LIMIT) {
      const toEvict = activeSessions.slice(0, activeSessions.length - DOCTOR_DEVICE_LIMIT);
      for (const session of toEvict) {
        await deleteActiveTokenById(session.token_id);
      }
      console.log(`[DoctorAuth] Evicted ${toEvict.length} oldest session(s) for doctor_id=${doctorId}`);
    }
  } catch (tokenErr) {
    console.error('[DoctorAuth] Failed to manage active tokens:', tokenErr.message);
  }
}

async function doctorLogin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Username and password are required' });
  }

  try {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('doctor_id, username, phone, password_hash, is_deleted')
      .eq('username', username)
      .single();

    if (error || !doctor) {
      console.warn(`[DoctorAuth] Login attempt for non-existent username: ${username}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
    }

    if (doctor.is_deleted) {
      console.warn(`[DoctorAuth] Login attempt for deleted doctor: ${username}`);
      return res.status(403).json({ error: 'Forbidden', message: 'This account has been deactivated' });
    }

    const isValid = await bcrypt.compare(password, doctor.password_hash);
    if (!isValid) {
      console.warn(`[DoctorAuth] Invalid password for doctor: ${username}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
    }

    const loginId = `doctor_${doctor.doctor_id}_${crypto.randomBytes(8).toString('hex')}`;
    const tokenPayload = { role: 'doctor', doctor_id: doctor.doctor_id, username: doctor.username };

    const storeResult = storePendingLogin({ loginId, role: 'doctor', phone: doctor.phone, tokenPayload });
    if (storeResult.error === 'cooldown') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Please wait before retrying', retryAfter: storeResult.retryAfter });
    }

    const otp = generateOTP(doctor.phone);
    updateLoginOTP(loginId, otp);
    await sendSMSOTP(otp, doctor.phone, doctor.username);

    console.log(`[DoctorAuth] Password verified, OTP sent for doctor: ${username} (ID: ${doctor.doctor_id})`);
    return res.status(200).json({ requires_otp: true, loginId, phone_masked: maskPhone(doctor.phone) });
  } catch (err) {
    console.error('[DoctorAuth] Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'An error occurred during login' });
  }
}

async function doctorVerifyLoginOTP(req, res) {
  const { loginId, otp } = req.body;

  if (!loginId || !otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId and otp are required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'doctor') {
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

    const token = generateToken(pending.tokenPayload, { expiresIn: DOCTOR_TOKEN_EXPIRY });
    await storeTokenAndEnforceLimit(token, pending.tokenPayload.doctor_id, req.ip);

    console.log(`[DoctorAuth] 2FA complete for doctor_id=${pending.tokenPayload.doctor_id}`);
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[DoctorAuth] OTP verify error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function doctorResendLoginOTP(req, res) {
  const { loginId } = req.body;

  if (!loginId) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId is required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'doctor') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired login session' });
    }

    if (pending.otpSentAt && Date.now() - pending.otpSentAt < 60 * 1000) {
      const retryAfter = Math.ceil((60 * 1000 - (Date.now() - pending.otpSentAt)) / 1000);
      return res.status(429).json({ error: 'Too Many Requests', message: 'Please wait before resending', retryAfter });
    }

    const otp = generateOTP(pending.phone);
    updateLoginOTP(loginId, otp);
    await sendSMSOTP(otp, pending.phone, pending.tokenPayload.username);

    console.log(`[DoctorAuth] OTP resent for loginId=${loginId}`);
    return res.status(200).json({ message: 'OTP resent' });
  } catch (err) {
    console.error('[DoctorAuth] Resend OTP error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { doctorLogin, doctorVerifyLoginOTP, doctorResendLoginOTP };
