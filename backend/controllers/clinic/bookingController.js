const supabase = require('../../db');
const hashForSearch = require('../../utils/hashForSearch');
const { decrypt } = require('../../utils/pii');
const phoneField = require('../../validators/fields/phone');
const { generateOTP } = require('../../utils/generateOTP');
const sendSMSOTP = require('../../utils/msg/sendSMSOTP');
const { isDebugNumber } = require('../../utils/debugNumbers');
const { getClinicById } = require('../../queries/read/getClinics');
const {
  storePendingBooking, getPendingBooking, updateBookingOTP,
  incrementOTPAttempts, markAuthenticated, deletePendingBooking,
  setRegisteredUserId,
} = require('../../utils/pendingBookings');
const bcrypt = require('bcrypt');
const { encrypt } = require('../../utils/pii');
const { generatePassword } = require('../../utils/generatePassword');
const sendMessage = require('../../utils/msg/sendMessage');
const insertUser = require('../../queries/create/createUser');
const validateWithSchema = require('../../validators/validator');
const createUserSchema = require('../../validators/schemas/createUserSchema');
const { createAppointment } = require('../../queries/create/createAppointment');
const { getSlotById } = require('../../queries/read/getSlots');
const { consumeBooking } = require('../../utils/pendingBookings');

/**
 * POST /api/clinic/booking/lookup
 * Look up patients by phone number.
 */
async function lookupPatient(req, res) {
  const { phone } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Bad Request', message: 'phone is required' });
  }

  const normalized = phoneField.normalize(phone);
  const phoneError = phoneField.validate(normalized);
  if (phoneError) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid phone: ${phoneError}` });
  }

  try {
    const phoneHash = hashForSearch(normalized);
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, first_name, last_name, phone')
      .eq('phone_hash', phoneHash);

    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(200).json({ found: false, users: [] });
    }

    // Decrypt PII for display
    const decryptedUsers = users.map(u => ({
      user_id: u.user_id,
      first_name: safeDecrypt(u.first_name),
      last_name: safeDecrypt(u.last_name),
    }));

    return res.status(200).json({ found: true, users: decryptedUsers });
  } catch (err) {
    console.error('[Booking:Lookup] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

function safeDecrypt(value) {
  try { return decrypt(value); } catch { return value; }
}

/**
 * POST /api/clinic/booking/send-otp
 * Send OTP to patient's phone for booking authentication.
 */
async function sendBookingOTP(req, res) {
  const { phone, user_id } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Bad Request', message: 'phone is required' });
  }

  const normalized = phoneField.normalize(phone);
  const phoneError = phoneField.validate(normalized);
  if (phoneError) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid phone: ${phoneError}` });
  }

  try {
    // If user_id provided, verify the user exists and phone matches
    if (user_id) {
      const phoneHash = hashForSearch(normalized);
      const { data: user, error } = await supabase
        .from('users')
        .select('user_id, phone_hash')
        .eq('user_id', user_id)
        .maybeSingle();

      if (error) throw error;
      if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
      if (user.phone_hash !== phoneHash) {
        return res.status(400).json({ error: 'Bad Request', message: 'Phone does not match user record' });
      }
    }

    // Get clinic name for SMS context
    const clinic = await getClinicById(req.clinicId);
    const clinicName = clinic?.clinic_name || `Clinic #${req.clinicId}`;

    const bookingId = storePendingBooking({
      phone: normalized,
      userId: user_id || null,
      clinicId: req.clinicId,
      clinicAdminId: req.clinicAdminId || null,
      clinicName,
      adminName: req.actorName || 'Staff',
    });

    const clinicIsDebug = clinic?.phone && isDebugNumber(clinic.phone);
    const otp = clinicIsDebug ? '123456' : generateOTP(normalized);
    updateBookingOTP(bookingId, otp);

    if (clinicIsDebug) {
      console.log(`[DEV_OTP] recipient=${normalized} otp=${otp} (SMS skipped — debug clinic)`);
    } else {
      await sendSMSOTP(otp, normalized, 'Patient', clinicName, req.actorName || 'Staff');
    }

    console.log(`[Booking:OTP] Sent to ${normalized} for clinic=${req.clinicId} bookingId=${bookingId}`);
    return res.status(200).json({ bookingId });
  } catch (err) {
    console.error('[Booking:SendOTP] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/clinic/booking/verify-otp
 * Verify OTP for booking authentication.
 */
async function verifyBookingOTP(req, res) {
  const { bookingId, otp } = req.body || {};

  if (!bookingId || !otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'bookingId and otp are required' });
  }

  const booking = getPendingBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking session expired or not found' });
  }

  if (!booking.otp) {
    return res.status(400).json({ error: 'Bad Request', message: 'OTP has not been sent yet' });
  }

  if (String(otp).trim() !== String(booking.otp).trim()) {
    const remaining = incrementOTPAttempts(bookingId);
    if (remaining <= 0) {
      deletePendingBooking(bookingId);
      console.warn(`[Booking:OTP] Max attempts reached for bookingId=${bookingId}`);
      return res.status(403).json({ error: 'Forbidden', message: 'Maximum OTP attempts exceeded. Please start over.' });
    }
    return res.status(400).json({ error: 'Bad Request', message: 'Incorrect OTP', attemptsRemaining: remaining });
  }

  // OTP correct — mark authenticated
  markAuthenticated(bookingId);
  console.log(`[Booking:OTP] Verified for bookingId=${bookingId} userId=${booking.userId || 'new'}`);
  return res.status(200).json({ authenticated: true, userId: booking.userId || null });
}

/**
 * POST /api/clinic/booking/register-patient
 * Register a new patient through the booking flow (after OTP verification).
 */
async function registerBookingPatient(req, res) {
  const { bookingId, patient } = req.body || {};

  if (!bookingId || !patient) {
    return res.status(400).json({ error: 'Bad Request', message: 'bookingId and patient are required' });
  }

  const booking = getPendingBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking session expired or not found' });
  }
  if (!booking.authenticated) {
    return res.status(403).json({ error: 'Forbidden', message: 'OTP not yet verified' });
  }
  if (booking.userId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Patient already identified — skip registration' });
  }

  // Force phone to match the OTP-verified phone
  patient.phone = booking.phone;

  // Validate patient data
  const { success, data, errors } = validateWithSchema(createUserSchema, patient, { encryptPII: true });
  if (!success) {
    return res.status(400).json({ error: 'Validation failed', issues: errors });
  }

  try {
    // Generate password for the new patient
    const plainPassword = generatePassword(14);
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Generate search hashes (from unencrypted values)
    const phoneNormalized = phoneField.normalize(patient.phone);
    const phoneHash = hashForSearch(phoneNormalized);
    const nameHash = hashForSearch(`${patient.first_name.trim().toLowerCase()}${patient.last_name.trim().toLowerCase()}`);

    // Check max 3 accounts per phone
    const { data: existingByPhone } = await supabase
      .from('users')
      .select('user_id')
      .eq('phone_hash', phoneHash);

    if (existingByPhone && existingByPhone.length >= 3) {
      return res.status(400).json({ error: 'Bad Request', message: 'Maximum 3 accounts per phone number' });
    }

    // Obfuscate location
    if (data.location_x) data.location_x = Math.round(data.location_x * 100) / 100;
    if (data.location_y) data.location_y = Math.round(data.location_y * 100) / 100;

    // Insert user
    const result = await insertUser(supabase, {
      ...data,
      hash: passwordHash,
      phone_hash: phoneHash,
      name_hash: nameHash,
    });

    if (!result.success) {
      if (result.error?.code === '23505') {
        return res.status(409).json({ error: 'Conflict', message: 'Patient with this phone and name already exists' });
      }
      throw result.error;
    }

    // Store user_id on pending booking
    setRegisteredUserId(bookingId, result.user.user_id);

    // Send password via SMS so patient can log in
    const phoneNorm = phoneField.normalize(patient.phone);
    await sendMessage(
      `Dear ${patient.first_name}, your SwasthyaSeva account has been created. Your temporary password is: ${plainPassword} — please change it after your first login.`,
      phoneNorm
    );

    console.log(`[Booking:Register] OK user_id=${result.user.user_id} for bookingId=${bookingId}`);
    return res.status(201).json({
      user_id: result.user.user_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
    });
  } catch (err) {
    console.error('[Booking:Register] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * POST /api/clinic/booking/create-appointment
 * Create an appointment after OTP-verified booking flow.
 */
async function createBookingAppointment(req, res) {
  const {
    bookingId, slot_id, appointment_date, symptom_code, symptom_text,
    complaints, recommended_time, booking_fee_paid, appointment_status,
  } = req.body || {};

  if (!bookingId || !slot_id || !appointment_date || !symptom_code) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'bookingId, slot_id, appointment_date, and symptom_code are required',
    });
  }

  const booking = getPendingBooking(bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Not Found', message: 'Booking session expired or not found' });
  }
  if (!booking.authenticated) {
    return res.status(403).json({ error: 'Forbidden', message: 'OTP not yet verified' });
  }

  const userId = booking.userId || booking.registeredUserId;
  if (!userId) {
    return res.status(400).json({ error: 'Bad Request', message: 'Patient not yet identified. Register first.' });
  }

  // Validate status
  const validStatuses = ['accepted', 'waiting'];
  const status = appointment_status || 'accepted';
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Bad Request', message: `appointment_status must be: ${validStatuses.join(', ')}` });
  }

  try {
    // Validate slot belongs to this clinic
    const slot = await getSlotById(slot_id);
    if (!slot) {
      return res.status(404).json({ error: 'Not Found', message: 'Slot not found' });
    }
    if (slot.clinic_id !== req.clinicId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Slot does not belong to this clinic' });
    }

    // Validate day-of-week matches
    const dayMap = { 0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
    const dateObj = new Date(appointment_date);
    const expectedDay = dayMap[dateObj.getUTCDay()];
    if (expectedDay !== slot.slot_day) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Date ${appointment_date} is a ${expectedDay}, but slot is for ${slot.slot_day}`,
      });
    }

    const appointment = await createAppointment({
      userId,
      doctorId: slot.doctor_id,
      slotId: slot_id,
      symptomCode: symptom_code,
      symptomText: symptom_text,
      complaints: complaints || null,
      recommendedTime: recommended_time || null,
      appointmentDate: appointment_date,
      appointmentStatus: status,
      bookingFeePaid: booking_fee_paid != null ? Number(booking_fee_paid) : (slot.booking_fee || 0),
    });

    // Consume the pending booking
    consumeBooking(bookingId);

    console.log(`[Booking:Appointment] OK appointment_id=${appointment.appointment_id} slot=${slot_id} user=${userId} by clinic=${req.clinicId}`);
    return res.status(201).json({ appointment });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Conflict', message: 'Appointment slot already taken for this date and index' });
    }
    console.error('[Booking:Appointment] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { lookupPatient, sendBookingOTP, verifyBookingOTP, registerBookingPatient, createBookingAppointment };
