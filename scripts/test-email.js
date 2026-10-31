require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { sendEmailOTP } = require('../backend/utils/email');

const TEST_EMAIL = process.env.TEST_EMAIL;

async function main() {
    console.log('=== MSG91 Email Test ===\n');
    console.log('MSG91_AUTH_KEY:', process.env.MSG91_AUTH_KEY ? 'set' : 'NOT SET');
    console.log('MSG91_EMAIL_DOMAIN:', process.env.MSG91_EMAIL_DOMAIN || 'NOT SET');
    console.log('MSG91_EMAIL_SENDER:', process.env.MSG91_EMAIL_SENDER || 'NOT SET');
    console.log('MSG91_EMAIL_OTP_TEMPLATE_ID:', process.env.MSG91_EMAIL_OTP_TEMPLATE_ID || 'NOT SET');
    console.log('MSG91_EMAIL_REG_TEMPLATE_ID:', process.env.MSG91_EMAIL_REG_TEMPLATE_ID || 'NOT SET');
    console.log('MSG91_EMAIL_RECEPTIONIST_TEMPLATE_ID:', process.env.MSG91_EMAIL_RECEPTIONIST_TEMPLATE_ID || 'NOT SET');
    console.log('TEST_EMAIL:', TEST_EMAIL || 'NOT SET');

    if (!TEST_EMAIL) {
        console.error('\nSet TEST_EMAIL in backend/.env');
        process.exit(1);
    }
    console.log('');

    console.log('[Test 1] sendEmailOTP — access OTP');
    const r1 = await sendEmailOTP(TEST_EMAIL, '123456', 'TestUser');
    console.log('Result:', r1, '\n');

    console.log('[Test 2] sendEmailOTP — registration OTP with password');
    const r2 = await sendEmailOTP(TEST_EMAIL, '654321', 'TestUser', null, null, 'TempPass123');
    console.log('Result:', r2, '\n');

    console.log('[Test 3] sendEmailOTP — receptionist OTP');
    const r3 = await sendEmailOTP(TEST_EMAIL, '111222', 'TestUser', 'City Clinic', 'Dr. Smith');
    console.log('Result:', r3, '\n');

    console.log('=== Done ===');
}

main().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
