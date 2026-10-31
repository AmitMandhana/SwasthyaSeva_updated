const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');
const { DOCTOR_FIELDS_WITH_NAMES, flattenDoctorNames } = require('./getDoctors');
const { getDoctorExtraQualifications } = require('./getDoctorExtraQualifications');
const { getExtraQualifications } = require('./getExtraQualifications');

/**
 * Returns a doctor's ID and basic info by username (exact match, case-insensitive).
 * @param {string} username
 * @returns {Promise<{ doctor_id: number, first_name: string, last_name: string }|null>}
 */
async function getDoctorByUsername(username) {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('doctors')
        .select('doctor_id, first_name, last_name')
        .ilike('username', username.trim())
        .eq('is_deleted', false)
        .maybeSingle();
    },
    initDoctorsSQL
  );
  if (result.error) throw result.error;
  return result.data;
}

/**
 * Returns a full public doctor profile by username with resolved names.
 * Only returns verified, non-deleted doctors.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getDoctorProfileByUsername(username) {
  const result = await withTableGuard(
    async () => {
      return await supabase
        .from('doctors')
        .select(DOCTOR_FIELDS_WITH_NAMES)
        .ilike('username', username.trim())
        .eq('is_deleted', false)
        .eq('verified_doctor', true)
        .maybeSingle();
    },
    initDoctorsSQL
  );
  if (result.error) throw result.error;
  if (!result.data) return null;

  const doc = flattenDoctorNames(result.data);

  // Fetch extra qualifications with resolved names
  const eqRecords = await getDoctorExtraQualifications(doc.doctor_id);
  let extraQualifications = [];
  if (eqRecords.length > 0) {
    const allEq = await getExtraQualifications();
    const eqMap = new Map(allEq.map(q => [q.qualification_code, q.name]));
    extraQualifications = eqRecords.map(r => ({
      qualification_code: r.qualification_code,
      name: eqMap.get(r.qualification_code) ?? r.qualification_code,
    }));
  }

  // Strip internal fields
  const { password_hash, is_deleted, created_at, signature_link, ...profile } = doc;
  return { ...profile, extra_qualifications: extraQualifications };
}

module.exports = { getDoctorByUsername, getDoctorProfileByUsername };
