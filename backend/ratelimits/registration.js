const { createRateLimit } = require('./rateLimiter');

const initiateRegistrationRateLimit = createRateLimit({
    mode: 'user',
    windowMs: 60 * 1000,
    max: 1,
    message: 'Too many registration attempts. Please try again in a minute.'
});

const initiateRegistrationDailyLimit = createRateLimit({
    mode: 'user',
    windowMs: 24 * 60 * 60 * 1000,
    max: 100,
    message: 'Daily registration limit reached. Maximum 100 registrations per day.'
});

const completeRegistrationRateLimit = createRateLimit({
    mode: 'user',
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many OTP verification attempts. Please try again in a minute.'
});

module.exports = {
    initiateRegistrationRateLimit,
    initiateRegistrationDailyLimit,
    completeRegistrationRateLimit
};

