const { createClient } = require("@supabase/supabase-js");
const verifyEnvVars = require("./utils/verifyEnvVars");
require("dotenv").config();

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY'
];

verifyEnvVars(requiredEnvVars);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

module.exports = supabase;
