async function sendSMSMSG91(recipient, variables) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_SMS_TEMPLATE_ID;

    if (!authKey || !templateId) {
        console.warn('[MSG91] SMS not configured — MSG91_AUTH_KEY or MSG91_SMS_TEMPLATE_ID missing');
        return false;
    }

    try {
        const res = await fetch('https://control.msg91.com/api/v5/flow/', {
            method: 'POST',
            headers: {
                authkey: authKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                template_id: templateId,
                short_url: '0',
                recipients: [
                    {
                        mobiles: recipient.replace(/^\+/, ''),
                        ...variables,
                    },
                ],
            }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && (data.type === 'success' || data.message === 'success')) {
            return true;
        }

        console.error('[MSG91] SMS failed:', res.status, data);
        return false;
    } catch (err) {
        console.error('[MSG91] SMS error:', err.message);
        return false;
    }
}

module.exports = sendSMSMSG91;
