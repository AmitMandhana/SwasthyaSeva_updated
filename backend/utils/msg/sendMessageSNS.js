
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'ap-south-1',
});

async function sendMessageSNS(message, recipient) {
    const params = {
        Message: message,
        PhoneNumber: recipient,
    };
    try {
        const command = new PublishCommand(params);
        const result = await snsClient.send(command);
        return result;
    } catch (error) {
        console.warn('Error sending SNS message:', error);
        return false;
    }
}

module.exports = sendMessageSNS;