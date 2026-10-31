const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initComplaintsSQL = require('../init/initComplaints');

async function getComplaints() {
  return withTableGuard(async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('complaint_code, name')
      .order('name');
    if (error) throw error;
    return data || [];
  }, initComplaintsSQL);
}

module.exports = { getComplaints };
