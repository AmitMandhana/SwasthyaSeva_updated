const usedTokens = new Map();
const TOKEN_TTL = 2 * 60 * 1000; // 2 minutes

// Cleanup expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of usedTokens.entries()) {
    if (now - timestamp > TOKEN_TTL) {
      usedTokens.delete(token);
    }
  }
}, 60 * 1000);

async function verifyTurnstileToken(token, expectedAction = 'initiate-registration') {
  if (!token) return false;

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isTestKey = secretKey === '1x0000000000000000000000000000000AA';

  // Check if token was already used (replay attack prevention)
  // Skip for Cloudflare test keys which always return the same dummy token
  if (!isTestKey && usedTokens.has(token)) {
    console.warn('⚠️ Turnstile token replay attempt detected:', { token: token.substring(0, 20) + '...' });
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    
    // Verify success
    if (data.success !== true) {
      console.warn('⚠️ Turnstile verification failed:', { success: data.success, 'error-codes': data['error-codes'] });
      return false;
    }

    // Check if token is expired or too old (challenge_ts is ISO 8601 timestamp)
    if (data.challenge_ts) {
      const challengeTime = new Date(data.challenge_ts).getTime();
      const now = Date.now();
      const ageMinutes = (now - challengeTime) / 1000 / 60;
      
      if (ageMinutes > 5) {
        console.warn('⚠️ Turnstile token too old:', { ageMinutes });
        return false;
      }
    }

    // Verify the action matches expected purpose
    if (data.action && data.action !== expectedAction) {
      console.warn('⚠️ Turnstile action mismatch:', { expected: expectedAction, received: data.action });
      return false;
    }

    // Mark token as used to prevent replay
    usedTokens.set(token, Date.now());
    
    return true;
  } catch (error) {
    console.error('Error verifying Turnstile token:', error);
    return false;
  }
}

module.exports = {
  verifyTurnstileToken
};