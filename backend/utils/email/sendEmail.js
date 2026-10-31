const sendEmailMailgun = require('./sendEmailMailgun');
const sendEmailMSG91 = require('./sendEmailMSG91');
const { OTP_BYPASS } = require('../../config/env');

// Responsive HTML email template (kept for Mailgun fallback)
function wrapInTemplate(content) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email</title>
        <style>
            body { margin: 0; padding: 0; background: #fafafa; font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 20px auto; background: #fafafa; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); overflow: hidden; }
            .header {
                background: #1976d2;
                color: #fff;
                padding: 24px 20px 16px 20px;
                text-align: center;
                font-size: 28px;
                font-family: Arial, sans-serif;
                font-weight: bold;
            }
            .header-content {
                display: inline-block;
                vertical-align: middle;
            }
            .header img {
                max-width: 60px;
                width: 100%;
                height: auto;
                vertical-align: middle;
                color-scheme: light only;
            }
            .content { padding: 24px 20px; color: #000; font-size: 16px; line-height: 1.6; }
            .footer { background: #eee; color: #222; text-align: center; padding: 16px 20px; font-size: 13px; }
            @media (max-width: 700px) {
                .container { width: 95% !important; }
                .content, .header { padding-left: 10px; padding-right: 10px; }
                .footer { padding-left: 16px; padding-right: 16px; }
            }
            @media (max-width: 480px) {
                .header {
                    font-size: 22px;
                    padding: 18px 8px 10px 8px;
                    font-family: Arial, sans-serif;
                }
                .content { font-size: 15px; padding: 16px 16px; }
                .footer { font-size: 12px; padding: 10px 8px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="header-content">
                    SwasthyaSeva
                </span>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">&copy; ${new Date().getFullYear()} SwasthyaSeva. All rights reserved.</div>
        </div>
    </body>
    </html>`;
}

async function sendEmail(to, toName, templateId, variables) {
    if (OTP_BYPASS) {
        console.log(`[OTP_BYPASS] email skipped to=${to} template=${templateId}`, variables);
        return true;
    }
    if (process.env.MSG91_AUTH_KEY) {
        return sendEmailMSG91(to, toName, templateId, variables);
    }
    console.log(`[Email:DEV] to=${to} template=${templateId}`, variables);
    return true;
}

module.exports = sendEmail;