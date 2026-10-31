require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { sendSMSOTP } = require('../backend/utils/msg');
const sendMessage = require('../backend/utils/msg/sendMessage');

const TEST_PHONE = process.env.TEST_PHONE;

async function main() {
    console.log('=== MSG91 SMS Test ===\n');
    console.log('MSG91_AUTH_KEY:', process.env.MSG91_AUTH_KEY ? 'set' : 'NOT SET');
    console.log('MSG91_SMS_TEMPLATE_ID:', process.env.MSG91_SMS_TEMPLATE_ID || 'NOT SET');
    console.log('TEST_PHONE:', TEST_PHONE || 'NOT SET');

    if (!TEST_PHONE) {
        console.error('\nSet TEST_PHONE in backend/.env');
        process.exit(1);
    }
    console.log('');

    console.log('[Test 1] sendMessage — direct message');
    const r1 = await sendMessage('Hello from SwasthyaSeva test script.', TEST_PHONE);
    console.log('Result:', r1, '\n');

    console.log('[Test 2] sendSMSOTP — access OTP');
    const r2 = await sendSMSOTP('123456', TEST_PHONE, 'TestUser');
    console.log('Result:', r2, '\n');

    console.log('[Test 3] sendSMSOTP — registration OTP with password');
    const r3 = await sendSMSOTP('654321', TEST_PHONE, 'TestUser', null, null, 'TempPass123');
    console.log('Result:', r3, '\n');

    console.log('[Test 4] sendSMSOTP — receptionist OTP');
    const r4 = await sendSMSOTP('111222', TEST_PHONE, 'TestUser', 'City Clinic', 'Dr. Smith');
    console.log('Result:', r4, '\n');

    console.log('[Test 5] sendSMSOTP — invalid phone (should return false)');
    const r5 = await sendSMSOTP('999999', '12345', 'TestUser');
    console.log('Result:', r5, '(expected: false)\n');

    console.log('=== Done ===');
}

main().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
