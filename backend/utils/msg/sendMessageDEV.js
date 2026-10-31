function sendMessageDEV(message, recipient) {
    console.log(`Sending message to ${recipient}: ${message}\n`);
    return true;
}

module.exports = sendMessageDEV;