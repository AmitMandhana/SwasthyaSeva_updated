const validateWithSchema = require("../../validators/validator");
const createUserSchema = require("../../validators/schemas/createUserSchema");
const { verifyTurnstileToken } = require("../../utils/captcha");
const { generatePassword } = require("../../utils/generatePassword");
const { encrypt, decrypt } = require("../../utils/pii");
const { storePendingRegistration } = require("../../utils/pendingRegistrations");
const { sendRegistrationOTP } = require("./sendRegistrationOTP");
const supabase = require("../../db");
const hashForSearch = require("../../utils/hashForSearch");
const { logAuthEvent, AuthEvents } = require("../../utils/auditLog");

async function initiateRegistration(req, res) {
  const { turnstileToken } = req.body;
  
  if (!turnstileToken) {
    return res.status(400).json({ 
      error: "Bad Request",
      message: "turnstileToken is required" 
    });
  }

  // Verify Turnstile token first
  const isValid = await verifyTurnstileToken(turnstileToken, 'initiate-registration');
  if (!isValid) {
    logAuthEvent(AuthEvents.CAPTCHA_FAILED, {
      adminId: req.userId,
      reason: 'Invalid, expired, reused, or mismatched captcha token'
    });
    return res.status(400).json({ 
      error: "Bad Request",
      message: "Invalid captcha solution" 
    });
  }

  // Schema validation
  const { success, data, errors } = validateWithSchema(createUserSchema, req.body);
  if (!success) {
    return res.status(400).json({ error: "Validation failed", issues: errors });
  }

  // Generate secure password for the user
  const generatedPassword = generatePassword();
  
  // Encrypt and add password to data
  data.password = encrypt(generatedPassword);

  // Check constraints BEFORE sending OTP
  // Generate hashes for searchable fields (need to decrypt for hashing)
  const phoneHash = hashForSearch(decrypt(data.phone));
  const nameHash = hashForSearch(decrypt(data.first_name) + decrypt(data.last_name));

  // Check max 3 accounts per phone number
  const { data: existingUsers, error: countError } = await supabase
    .from('users')
    .select('user_id')
    .eq('phone_hash', phoneHash);

  if (countError) {
    console.error('Error checking phone count:', countError);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (existingUsers && existingUsers.length >= 3) {
    logAuthEvent(AuthEvents.CONSTRAINT_VIOLATION, {
      adminId: req.userId,
      constraint: 'max_3_accounts_per_phone',
      phoneHash: phoneHash.substring(0, 10) + '...'
    });
    return res.status(400).json({
      error: "Bad Request",
      message: "Maximum of 3 accounts allowed per phone number"
    });
  }

  // Check phone + name unique constraint
  const { data: duplicateUser, error: duplicateError } = await supabase
    .from('users')
    .select('user_id')
    .eq('phone_hash', phoneHash)
    .eq('name_hash', nameHash)
    .single();

  if (duplicateUser) {
    logAuthEvent(AuthEvents.CONSTRAINT_VIOLATION, {
      adminId: req.userId,
      constraint: 'unique_phone_name_combination',
      phoneHash: phoneHash.substring(0, 10) + '...',
      nameHash: nameHash.substring(0, 10) + '...'
    });
    return res.status(400).json({
      error: "Bad Request",
      message: "A user with this phone number and name combination already exists"
    });
  }

  // Get admin's clinic info for OTP message from middleware
  const { clinicName, adminName: receptionistName } = req.adminInfo;

  // Store the validated data and generated password
  const registrationId = storePendingRegistration(data, generatedPassword);

  // Send OTP immediately
  try {
    const result = await sendRegistrationOTP(registrationId, {
      userData: data,
      generatedPassword
    }, clinicName, receptionistName);
    
    if (!result.success) {
      logAuthEvent(AuthEvents.REGISTRATION_FAILED, {
        adminId: req.userId,
        registrationId,
        reason: 'OTP send failure'
      });
      return res.status(500).json({ 
        error: "Internal server error",
        message: result.message || "Failed to send OTP" 
      });
    }

    logAuthEvent(AuthEvents.REGISTRATION_INITIATED, {
      adminId: req.userId,
      registrationId,
      clinicName: req.adminInfo.clinicName,
      clinicId: req.adminInfo.clinicId
    });

    logAuthEvent(AuthEvents.OTP_SENT, {
      adminId: req.userId,
      registrationId,
      phoneHash: phoneHash.substring(0, 10) + '...'
    });

    return res.status(200).json({
      message: "OTP sent successfully to patient's phone number",
      registrationId
    });
  } catch (error) {
    console.error('Error in initiateRegistration:', error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: "Failed to send OTP" 
    });
  }
}

module.exports = { initiateRegistration };