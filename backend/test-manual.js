require('dotenv').config();
const city = require("./validators/fields/city");
const country = require("./validators/fields/country");
const dob = require("./validators/fields/dob");
const email = require("./validators/fields/email");
const gender = require("./validators/fields/gender");
const location_y = require("./validators/fields/location_y");
const location_x = require("./validators/fields/location_x");
const name = require("./validators/fields/name");
const password = require("./validators/fields/password");
const phone = require("./validators/fields/phone");
const state = require("./validators/fields/state");
const streetAddress = require("./validators/fields/streetAddress");
const { encrypt, decrypt } = require("./utils/pii");
const {sendSMSOTP} = require("./utils/msg");
const {sendEmailOTP} = require("./utils/email");
function test(validator, value, expected = true) {
    const normalized = validator.normalize(value);
    const error = validator.validate(normalized);
    if(!error == expected) return true;
    console.log({value, normalized, error });
    return false;
}

function testValidator(validator, name, testCases) {
    console.log("Testing field", name);
    var i = 0;
    for (const testCase of testCases) 
        if (!test(validator, testCase.value, testCase.pass)) i++;
    console.log("Completed testing", name, "(", i, "mismatches in ", testCases.length, "tests )");
}

testValidator(city, "City", [
    { value: "New York", pass: true },
    { value: "   Los Angeles   ", pass: true },
    { value: "", pass: false },
    { value: null, pass: false },
    { value: 123, pass: false },
    { value: "A".repeat(101), pass: false },
]);

testValidator(phone, "Phone", [
    { value: "+911234567890", pass: true },
    { value: "1234567890", pass: true },
    { value: "12345", pass: false },
    { value: "12345678901234567890", pass: false },
    { value: null, pass: false },
    { value: "not a phone number", pass: false },
    { value: "+921234567890", pass: false },
    { value: "", pass: false },
]);

// Test PII Encryption/Decryption
console.log("\n=== Testing PII Encryption/Decryption ===");
const testData = [
    "john.doe@example.com",
    "+911234567890",
    "123 Main Street, Apt 4B",
    "Sensitive Patient Data",
    "Special chars: !@#$%^&*()"
];

let passed = 0;
let failed = 0;

testData.forEach((original, index) => {
    try {
        const encrypted = encrypt(original);
        const decrypted = decrypt(encrypted);
        
        if (decrypted === original) {
            console.log(`✓ Test ${index + 1}: PASS`);
            passed++;
        } else {
            console.log(`✗ Test ${index + 1}: FAIL - Decrypted value doesn't match`);
            console.log(`  Original: ${original}`);
            console.log(`  Decrypted: ${decrypted}`);
            failed++;
        }
    } catch (error) {
        console.log(`✗ Test ${index + 1}: ERROR - ${error.message}`);
        failed++;
    }
});

console.log(`\nPII Encryption Tests: ${passed} passed, ${failed} failed`);

sendSMSOTP("123456", "+911234567890", "John Doe", "Health Center", "Alice");
if (process.env.TEST_EMAIL) {
    sendEmailOTP(process.env.TEST_EMAIL, "123456", "John Doe", "Health Center", "Alice");
}