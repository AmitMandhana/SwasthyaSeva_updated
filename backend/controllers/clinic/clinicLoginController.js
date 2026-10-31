const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateToken } = require('../../jwt');
const supabase = require('../../db');
const { generateOTP } = require('../../utils/generateOTP');
const sendSMSOTP = require('../../utils/msg/sendSMSOTP');
const { storePendingLogin, getPendingLogin, updateLoginOTP, incrementLoginAttempts, deletePendingLogin } = require('../../utils/pendingLoginOTPs');

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return '****' + phone.slice(-4);
}

async function clinicLogin(req, res) {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'Phone and password are required' });
  }

  try {
    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('clinic_id, clinic_name, phone, password_hash, is_deleted')
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;

    if (!clinic) {
      console.warn(`[ClinicAuth] Login attempt for non-existent phone: ${phone}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid phone or password' });
    }

    if (clinic.is_deleted) {
      console.warn(`[ClinicAuth] Login attempt for deleted clinic: ${phone}`);
      return res.status(403).json({ error: 'Forbidden', message: 'This clinic has been deactivated' });
    }

    const isValid = await bcrypt.compare(password, clinic.password_hash);
    if (!isValid) {
      console.warn(`[ClinicAuth] Invalid password for clinic phone: ${phone}`);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid phone or password' });
    }

    const loginId = `clinic_${clinic.clinic_id}_${crypto.randomBytes(8).toString('hex')}`;
    const tokenPayload = {
      role: 'clinic',
      clinic_id: clinic.clinic_id,
      name: clinic.clinic_name || `Clinic ${clinic.clinic_id}`,
    };

    const storeResult = storePendingLogin({ loginId, role: 'clinic', phone: clinic.phone, tokenPayload });
    if (storeResult.error === 'cooldown') {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Please wait before retrying', retryAfter: storeResult.retryAfter });
    }

    const otp = generateOTP(clinic.phone);
    updateLoginOTP(loginId, otp);
    await sendSMSOTP(otp, clinic.phone, clinic.clinic_name);

    console.log(`[ClinicAuth] Password verified, OTP sent for clinic phone: ${phone} (ID: ${clinic.clinic_id})`);
    return res.status(200).json({ requires_otp: true, loginId, phone_masked: maskPhone(clinic.phone) });
  } catch (err) {
    console.error('[ClinicAuth] Clinic login error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'An error occurred during login' });
  }
}

async function clinicVerifyLoginOTP(req, res) {
  const { loginId, otp } = req.body;

  if (!loginId || !otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId and otp are required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'clinic') {
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

    const token = generateToken(pending.tokenPayload);

    console.log(`[ClinicAuth] 2FA complete for clinic_id=${pending.tokenPayload.clinic_id}`);
    return res.status(200).json({ token });
  } catch (err) {
    console.error('[ClinicAuth] OTP verify error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function clinicResendLoginOTP(req, res) {
  const { loginId } = req.body;

  if (!loginId) {
    return res.status(400).json({ error: 'Bad Request', message: 'loginId is required' });
  }

  try {
    const pending = getPendingLogin(loginId);
    if (!pending || pending.role !== 'clinic') {
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

module.exports = { clinicLogin, clinicVerifyLoginOTP, clinicResendLoginOTP };
