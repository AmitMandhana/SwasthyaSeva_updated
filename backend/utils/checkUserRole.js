const supabase = require("../db");
const { decrypt } = require("./pii");

async function isClinicAdmin(userId) {
  if (!userId) return false;
  
  try {
    // Get admin info with clinic details
    const { data: adminData, error: adminError } = await supabase
      .from('clinic_admins')
      .select('clinic_id, clinics(clinic_name)')
      .eq('admin_id', userId)
      .single();
    
    if (adminError || !adminData) {
      if (adminError?.code === 'PGRST116') return false;
      console.error('Error checking clinic admin status:', adminError);
      return false;
    }

    // Get admin's name
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('Error fetching admin user details:', userError);
      return false;
    }

    return {
      adminName: decrypt(userData.first_name) + ' ' + decrypt(userData.last_name),
      clinicName: adminData.clinics?.clinic_name || null,
      clinicId: adminData.clinic_id
    };
  } catch (error) {
    console.error('Error in isClinicAdmin:', error);
    return false;
  }
}

async function isDoctor(userId) {
  if (!userId) return false;
  
  const { data, error } = await supabase
    .from('Doctors')
    .select('doctor_id')
    .eq('doctor_id', userId)
    .single();
  
  if (error) {
    // If error is "no rows", user is not a doctor
    if (error.code === 'PGRST116') return false;
    console.error('Error checking doctor status:', error);
    return false;
  }
  
  return !!data;
}

module.exports = {
  isClinicAdmin,
  isDoctor
};