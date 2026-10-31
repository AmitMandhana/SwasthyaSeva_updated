const bcrypt = require("bcrypt");
const insertUser = require("../../queries/create/createUser");
const supabase = require("../../db");
const { generateToken } = require("../../jwt");
const decryptData = require("../../utils/decryptData");
const hashForSearch = require("../../utils/hashForSearch");
const createUserSchema = require("../../validators/schemas/createUserSchema");
const { decrypt } = require("../../utils/pii");

// Complete user registration after OTP verification
async function completeRegistration(data) {
  // Generate hashes for searchable fields
  const phoneHash = hashForSearch(decrypt(data.phone));
  const nameHash = hashForSearch(decrypt(data.first_name) + decrypt(data.last_name));

  // Check max 3 accounts per phone number
  const { data: existingUsers, error: countError } = await supabase
    .from('users')
    .select('user_id')
    .eq('phone_hash', phoneHash);

  if (countError) {
    console.error('Error checking phone count:', countError);
    throw new Error("Database error while checking phone usage");
  }

  if (existingUsers && existingUsers.length >= 3) {
    throw new Error("Maximum of 3 accounts allowed per phone number");
  }

  // Obfuscate location coordinates before storing (round to 2 decimal places for privacy)
  data.location_x = Math.round(data.location_x * 100) / 100;
  data.location_y = Math.round(data.location_y * 100) / 100;

  // Add hashes for searchable fields
  data.phone_hash = phoneHash;
  data.name_hash = nameHash;

  // Hash password
  const hash = await bcrypt.hash(decrypt(data.password), 12);

  // Insert user into database
  const result = await insertUser(supabase, { ...data, hash });
  
  if (!result.success) {
    // Handle unique constraint violation for phone + name combination
    if (result.error.code === '23505') {
      throw new Error("A user with this phone number and name combination already exists");
    }
    throw new Error("Failed to create user account");
  }
  
  // Automatically decrypt PII fields based on schema
  const decryptedUser = decryptData(createUserSchema, result.user);

  // Generate JWT token for the new user
  const token = generateToken({ user_id: result.user.user_id });
  
  return {
    message: "User created successfully",
    user: decryptedUser,
    token: `Bearer ${token}`
  };
}

module.exports = { completeRegistration };
