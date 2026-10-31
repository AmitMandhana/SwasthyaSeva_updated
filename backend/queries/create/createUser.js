async function insertUser(supabase, data) {
  const { data: user, error } = await supabase
    .from('users')
    .insert([
      {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email,
        dob: data.dob,
        password_hash: data.hash,
        gender: data.gender,
        street_address: data.street_address,
        city: data.city,
        state: data.state,
        country: data.country,
        location_x: data.location_x,
        location_y: data.location_y,
        phone_hash: data.phone_hash,
        name_hash: data.name_hash
      }
    ])
    .select('user_id, first_name, last_name, email, phone, gender, street_address, city, state, country, created_at')
    .single();

  if (error) {
    console.error('Error inserting user:', error);
    return { success: false, error };
  }

  return { success: true, user };
}

module.exports = insertUser;
