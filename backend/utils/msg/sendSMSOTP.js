const sendMessage = require('./sendMessage');
const sendSMSMSG91 = require('./sendSMSMSG91');
const { isDebugNumber } = require('../debugNumbers');
const { DEV_MODE, OTP_BYPASS } = require('../../config/env');

async function sendSMSOTP(otp, recipient, name, center = null, receptionist = null, password = null) {
	if (!/^\+91\d{10}$/.test(recipient)) {
		return false;
	}

	const direct = !center || !receptionist;
	let detail = '';

	if (direct) {
		if (password) {
			detail = `Your generated password is: ${password}. Please change it after login.`;
		}
	} else {
		detail = `Receptionist ${receptionist} at ${center} is requesting access on your behalf. Share this OTP only if you trust them with your account.`;
	}

	if (DEV_MODE || OTP_BYPASS || isDebugNumber(recipient)) {
		console.log(`[DEV_OTP] recipient=${recipient} otp=${otp}${password ? ` password=${password}` : ''} (SMS skipped)`);
		return true;
	}

	if (process.env.MSG91_AUTH_KEY && process.env.MSG91_SMS_TEMPLATE_ID) {
		return sendSMSMSG91(recipient, { name, otp, detail });
	}

	let message;
	if (direct) {
		if (password)
			message = `Dear ${name}, your OTP for account registration is: ${otp}. Your generated password is: ${password}. Please change it after login.`;
		else
			message = `Dear ${name}, your OTP for account access is: ${otp}`;
	} else {
		message = `Dear ${name}, Receptionist ${receptionist} at ${center} is requesting access on your behalf. This is your OTP: ${otp}. Share it only if you trust them with your account.`;
	}

	console.log(`[SMS_OTP] recipient=${recipient} provider=textbee`);

	const result = await sendMessage(message, recipient);
	return !!result;
}

module.exports = sendSMSOTP;
