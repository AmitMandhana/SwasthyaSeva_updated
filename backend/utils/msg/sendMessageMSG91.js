async function sendMessageMSG91(message, recipient) {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
        console.warn('[TextBee] SMS not configured — TEXTBEE_API_KEY or TEXTBEE_DEVICE_ID missing');
        return false;
    }

    try {
        const res = await fetch(
            `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
            {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recipients: [recipient], message }),
            }
        );

        const data = await res.json();

        if (data.data?.success) {
            return true;
        }

        console.error('[TextBee] SMS failed:', data);
        return false;
    } catch (err) {
        console.error('[TextBee] SMS error:', err.message);
        return false;
    }
}

module.exports = sendMessageMSG91;
