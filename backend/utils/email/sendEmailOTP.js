const sendEmail = require('./sendEmail');

async function sendEmailOTP(to, otp, name, center = null, receptionist = null, password = null) {
  const direct = !center || !receptionist;
  const year = String(new Date().getFullYear());
  let templateId, variables;

  if (direct) {
    if (password) {
      templateId = process.env.MSG91_EMAIL_REG_TEMPLATE_ID;
      variables = { name, otp, password, year };
    } else {
      templateId = process.env.MSG91_EMAIL_OTP_TEMPLATE_ID;
      variables = { name, otp, year };
    }
  } else {
    templateId = process.env.MSG91_EMAIL_RECEPTIONIST_TEMPLATE_ID;
    variables = { name, otp, center: center || 'the center', receptionist, year };
  }

  return sendEmail(to, name, templateId, variables);
}

module.exports = sendEmailOTP;
