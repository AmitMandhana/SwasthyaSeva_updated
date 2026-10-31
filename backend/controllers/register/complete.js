const { 
  getPendingRegistration, 
  incrementOTPAttempts,
  deletePendingRegistration,
  verifyAndConsume
} = require("../../utils/pendingRegistrations");
const { completeRegistration } = require("./completeRegistration");
const { logAuthEvent, AuthEvents } = require("../../utils/auditLog");

const MAX_OTP_ATTEMPTS = 3;

async function complete(req, res) {
  const { registrationId, otp } = req.body;

  if (!registrationId || !otp) {
    return res.status(400).json({ 
      error: "Bad Request",
      message: "registrationId and otp are required" 
    });
  }

  const pending = getPendingRegistration(registrationId);
  if (!pending) {
    return res.status(400).json({ 
      error: "Bad Request",
      message: "Invalid or expired registration ID" 
    });
  }

  if (!pending.otpRequested || !pending.otp) {
    return res.status(400).json({ 
      error: "Bad Request",
      message: "OTP not requested for this registration" 
    });
  }

  // Check OTP attempts EARLY - if already maxed out, delete and reject
  if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
    logAuthEvent(AuthEvents.OTP_MAX_ATTEMPTS, {
      adminId: req.userId,
      registrationId,
      attempts: pending.otpAttempts
    });
    deletePendingRegistration(registrationId);
    return res.status(400).json({ 
      error: "Bad Request",
      message: "Maximum OTP verification attempts exceeded. Please restart registration." 
    });
  }

  if (String(otp).trim() !== String(pending.otp).trim()) {
    incrementOTPAttempts(registrationId);
    const attemptsLeft = MAX_OTP_ATTEMPTS - pending.otpAttempts - 1;
    
    logAuthEvent(AuthEvents.OTP_FAILED, {
      adminId: req.userId,
      registrationId,
      attemptsRemaining: attemptsLeft
    });
    
    // If this was the last attempt, delete the registration
    if (attemptsLeft <= 0) {
      logAuthEvent(AuthEvents.OTP_MAX_ATTEMPTS, {
        adminId: req.userId,
        registrationId,
        attempts: MAX_OTP_ATTEMPTS
      });
      deletePendingRegistration(registrationId);
      return res.status(400).json({ 
        error: "Bad Request",
        message: "Invalid OTP. Maximum attempts exceeded. Please restart registration." 
      });
    }
    
    return res.status(400).json({ 
      error: "Bad Request",
      message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`
    });
  }

  // OTP verified, consume the registration and complete user creation
  logAuthEvent(AuthEvents.OTP_VERIFIED, {
    adminId: req.userId,
    registrationId
  });

  const data = verifyAndConsume(registrationId);
  if (!data) {
    logAuthEvent(AuthEvents.REGISTRATION_FAILED, {
      adminId: req.userId,
      registrationId,
      reason: 'Failed to retrieve registration data'
    });
    return res.status(500).json({ 
      error: "Internal server error",
      message: "Failed to retrieve registration data" 
    });
  }

  try {
    const result = await completeRegistration(data);
    
    logAuthEvent(AuthEvents.REGISTRATION_COMPLETED, {
      adminId: req.userId,
      registrationId,
      newUserId: result.user_id
    });
    
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error completing registration:', error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: "Failed to complete registration" 
    });
  }
}

module.exports = { complete };