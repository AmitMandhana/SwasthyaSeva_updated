require('dotenv').config();

function checkEnvironment() {
  if (!process.env.PII_SECRET) {
    console.error('❌ PII_SECRET environment variable is not set');
    console.error('Please set PII_SECRET in your .env file');
    process.exit(1);
  }
  
  if (process.env.PII_SECRET.length < 32) {
    console.error('❌ PII_SECRET must be at least 32 characters long for security');
    process.exit(1);
  }

  console.log('✓ PII_SECRET is configured');
  
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) {
    console.error('❌ TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are required');
    console.error('Please configure Cloudflare Turnstile keys in your .env file');
    process.exit(1);
  }
  
  console.log('✓ Turnstile keys configured');
  
  return true;
}

module.exports = checkEnvironment;