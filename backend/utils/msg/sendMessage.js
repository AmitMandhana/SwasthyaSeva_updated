const sendMessageDEV = require('./sendMessageDEV');
const sendMessageMSG91 = require('./sendMessageMSG91');
const { DEV_MODE } = require('../../config/env');

async function sendMessage(message, recipient) {
    if (DEV_MODE) {
        return sendMessageDEV(message, recipient);
    }
    if (process.env.TEXTBEE_API_KEY) {
        return sendMessageMSG91(message, recipient);
    }
    return sendMessageDEV(message, recipient);
}

module.exports = sendMessage;