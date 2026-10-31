async function sendEmailMSG91(to, toName, templateId, variables) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const domain = process.env.MSG91_EMAIL_DOMAIN;
    const sender = process.env.MSG91_EMAIL_SENDER;
    const senderName = process.env.MSG91_EMAIL_SENDER_NAME || 'SwasthyaSeva';

    if (!authKey || !domain || !sender || !templateId) {
        console.warn('[MSG91] Email not configured — missing auth key, domain, sender, or template ID');
        return false;
    }

    try {
        const res = await fetch('https://control.msg91.com/api/v5/email/send', {
            method: 'POST',
            headers: {
                authkey: authKey,
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                recipients: [
                    {
                        to: [{ name: toName || '', email: to }],
                        variables: variables || {},
                    },
                ],
                from: { name: senderName, email: sender },
                domain,
                template_id: templateId,
            }),
        });

        const data = await res.json();

        if (res.ok) {
            return true;
        }

        console.error('[MSG91] Email failed:', data);
        return false;
    } catch (err) {
        console.error('[MSG91] Email error:', err.message);
        return false;
    }
}

module.exports = sendEmailMSG91;
