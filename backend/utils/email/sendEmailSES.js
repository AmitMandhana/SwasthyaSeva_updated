const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({
	region: process.env.AWS_REGION || 'ap-south-1',
});

async function sendEmailSES(to, subject, text = '', html = '') {
	const from = process.env.FROM_EMAIL;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!to || !from || !domain || !process.env.MAILGUN_API_KEY) {
        console.warn('OTP email not fully configured. OTP not sent by email.');
        return false;
    }
	const params = {
		Source: from,
		Destination: {
			ToAddresses: [to],
		},
		Message: {
			Subject: { Data: subject },
			Body: {},
		},
	};
	if (html) {
		params.Message.Body.Html = { Data: html };
	}
	if (text) {
		params.Message.Body.Text = { Data: text };
	}
	try {
		const command = new SendEmailCommand(params);
		const result = await sesClient.send(command);
		return true;
	} catch (error) {
		console.warn('Error sending SES email:', error);
		return false;
	}
}

module.exports = sendEmailSES;