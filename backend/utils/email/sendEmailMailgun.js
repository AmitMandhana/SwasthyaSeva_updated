const Mailgun = require('mailgun.js');
const formData = require('form-data');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });

async function sendEmailMailgun(to, subject, text='',html='') {
    const from = process.env.FROM_EMAIL;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!to || !from || !domain || !process.env.MAILGUN_API_KEY) {
        console.warn('OTP email not fully configured. OTP not sent by email.');
        return false;
    }

    await mg.messages.create(domain, {
        from,
        to: [to],
        subject: subject,
        text: text,
        html: html,
    });

    return true;
}

module.exports = sendEmailMailgun;