const { updateOTP } = require("../../utils/pendingRegistrations");
const { generateOTP } = require("../../utils/generateOTP");
const sendSMSOTP = require("../../utils/msg/sendSMSOTP");
const { decrypt } = require("../../utils/pii");

async function sendRegistrationOTP(registrationId, pending, clinicName = null, receptionistName = null) {
  // Generate OTP
  const phone = decrypt(pending.userData.phone);
  const otp = generateOTP(phone);

  // Update pending registration with OTP
  const updated = updateOTP(registrationId, otp);
  if (!updated) {
    return { 
      success: false, 
      message: "Failed to update registration with OTP" 
    };
  }

  const firstName = decrypt(pending.userData.first_name);
  
  // Include generated password in OTP message if this is a registration
  const password = pending.generatedPassword;
  
  const sent = await sendSMSOTP(otp, phone, firstName, clinicName, receptionistName, password);
  
  if (!sent) {
    return { 
      success: false, 
      message: "Failed to send OTP to phone number" 
    };
  }

  return { success: true };
}

module.exports = { sendRegistrationOTP };