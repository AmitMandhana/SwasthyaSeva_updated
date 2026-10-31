const bcrypt = require('bcrypt');
const { generateToken } = require('../../jwt');
const supabase = require('../../db');
const hashForSearch = require('../../utils/hashForSearch');
const phoneField = require('../../validators/fields/phone');
const { createActiveToken } = require('../../queries/create/createActiveToken');
const { getActiveTokensByUser } = require('../../queries/read/getActiveTokens');
const { deleteActiveTokenById } = require('../../queries/delete/deleteActiveToken');
const { generateOTP } = require('../../utils/generateOTP');
const sendSMSOTP = require('../../utils/msg/sendSMSOTP');
const { storePendingOTP, getPendingOTP, updateOTP, incrementAttempts, deletePendingOTP } = require('../../utils/pendingPatientOTPs');
const { patient: patientAuth } = require('../../config/auth');

const PATIENT_DEVICE_LIMIT = patientAuth.deviceLimit;
const PATIENT_TOKEN_EXPIRY = patientAuth.tokenExpiry;
const PATIENT_TOKEN_EXPIRY_MS = patientAuth.tokenExpiryMs;

/**
 * Patient login with password
 * POST /api/patient/login
 * Body: { first_name, last_name, phone, password }
 * Returns: { token, user: { user_id, first_name } }
 */
async function patientLoginPassword(req, res) {
  const { first_name, last_name, phone, password } = req.body || {};

  if (!first_name || !last_name || !phone || !password) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'first_name, last_name, phone, and password are required',
    });
  }

  try {
    const normalized = phoneField.normalize(phone);
    const phoneError = phoneField.validate(normalized);
    if (phoneError) {
      return res.status(400).json({ error: 'Bad Request', message: `Phone: ${phoneError}` });
    }

    const phoneHash = hashForSearch(normalized);
    const nameHash = hashForSearch(`${first_name.trim().toLowerCase()}${last_name.trim().toLowerCase()}`);

    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, password_hash, phone_hash, name_hash')
      .eq('phone_hash', phoneHash)
      .eq('name_hash', nameHash)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      console.warn(`[PatientAuth] Login failed — account not found | phone_hash=${phoneHash.slice(0, 8)}…`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account not found',
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.warn(`[PatientAuth] Invalid password for user_id=${user.user_id}`);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials',
      });
    }

    const token = generateToken({
      role: 'patient',
      user_id: user.user_id,
      name: first_name.trim(),
    }, { expiresIn: PATIENT_TOKEN_EXPIRY });

    // Store active token and enforce device limit
    const expires_at = new Date(Date.now() + PATIENT_TOKEN_EXPIRY_MS);
    try {
      await createActiveToken({ token, role: 'patient', user_id: user.user_id, ip_address: req.ip, expires_at });

      const activeSessions = await getActiveTokensByUser('patient', user.user_id);
      if (activeSessions.length > PATIENT_DEVICE_LIMIT) {
        const toEvict = activeSessions.slice(0, activeSessions.length - PATIENT_DEVICE_LIMIT);
        for (const session of toEvict) {
          await deleteActiveTokenById(session.token_id);
        }
        console.log(`[PatientAuth] Evicted ${toEvict.length} oldest session(s) for user_id=${user.user_id}`);
      }
    } catch (tokenErr) {
      console.error('[PatientAuth] Failed to manage active tokens:', tokenErr.message);
    }

    console.log(`[PatientAuth] Login OK user_id=${user.user_id}`);
    return res.status(200).json({
      token,
      user: { user_id: user.user_id, first_name: first_name.trim() },
    });
  } catch (err) {
    console.error('[PatientAuth] Login error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login',
    });
  }
}

/**
 * Request OTP for patient login
 * POST /api/patient/request-otp
 * Body: { first_name, last_name, phone }
 * Returns: { message: "OTP sent" }
 */
async function requestPatientOTP(req, res) {
  const { first_name, last_name, phone } = req.body || {};

  if (!first_name || !last_name || !phone) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'first_name, last_name, and phone are required',
    });
  }

  try {
    const normalized = phoneField.normalize(phone);
    const phoneError = phoneField.validate(normalized);
    if (phoneError) {
      return res.status(400).json({ error: 'Bad Request', message: `Phone: ${phoneError}` });
    }

    const phoneHash = hashForSearch(normalized);
    const nameHash = hashForSearch(`${first_name.trim().toLowerCase()}${last_name.trim().toLowerCase()}`);

    // Verify user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('user_id, first_name')
      .eq('phone_hash', phoneHash)
      .eq('name_hash', nameHash)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Account not found',
      });
    }

    // Check cooldown
    const storeResult = storePendingOTP({
      phoneHash,
      nameHash,
      userId: user.user_id,
      phone: normalized,
      firstName: first_name.trim(),
    });

    if (storeResult.error === 'cooldown') {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Please wait ${storeResult.retryAfter}s before requesting another OTP`,
        retryAfter: storeResult.retryAfter,
      });
    }

    const otp = generateOTP(normalized);
    updateOTP(phoneHash, otp);
    await sendSMSOTP(otp, normalized, first_name.trim());

    console.log(`[PatientAuth] OTP sent to user_id=${user.user_id}`);
    return res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[PatientAuth] Request OTP error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while sending OTP',
    });
  }
}

/**
 * Verify OTP for patient login
 * POST /api/patient/verify-otp
 * Body: { first_name, last_name, phone, otp }
 * Returns: { token, user: { user_id, first_name } }
 */
async function verifyPatientOTP(req, res) {
  const { first_name, last_name, phone, otp } = req.body || {};

  if (!first_name || !last_name || !phone || !otp) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'first_name, last_name, phone, and otp are required',
    });
  }

  try {
    const normalized = phoneField.normalize(phone);
    const phoneHash = hashForSearch(normalized);

    const pending = getPendingOTP(phoneHash);
    if (!pending || !pending.otp) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No pending OTP found. Please request a new one.',
      });
    }

    if (String(otp).trim() !== String(pending.otp).trim()) {
      const remaining = incrementAttempts(phoneHash);
      if (remaining <= 0) {
        console.warn(`[PatientAuth] Max OTP attempts exceeded for user_id=${pending.userId}`);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Maximum OTP attempts exceeded. Please request a new OTP.',
        });
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid OTP',
        attemptsRemaining: remaining,
      });
    }

    // OTP matches — generate JWT
    deletePendingOTP(phoneHash);

    const token = generateToken({
      role: 'patient',
      user_id: pending.userId,
      name: pending.firstName,
    }, { expiresIn: PATIENT_TOKEN_EXPIRY });

    // Store active token
    const expires_at = new Date(Date.now() + PATIENT_TOKEN_EXPIRY_MS);
    try {
      await createActiveToken({ token, role: 'patient', user_id: pending.userId, ip_address: req.ip, expires_at });

      const activeSessions = await getActiveTokensByUser('patient', pending.userId);
      if (activeSessions.length > PATIENT_DEVICE_LIMIT) {
        const toEvict = activeSessions.slice(0, activeSessions.length - PATIENT_DEVICE_LIMIT);
        for (const session of toEvict) {
          await deleteActiveTokenById(session.token_id);
        }
      }
    } catch (tokenErr) {
      console.error('[PatientAuth] Failed to manage active tokens:', tokenErr.message);
    }

    console.log(`[PatientAuth] OTP login OK user_id=${pending.userId}`);
    return res.status(200).json({
      token,
      user: { user_id: pending.userId, first_name: pending.firstName },
    });
  } catch (err) {
    console.error('[PatientAuth] Verify OTP error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during OTP verification',
    });
  }
}

module.exports = { patientLoginPassword, requestPatientOTP, verifyPatientOTP };
