const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initDoctorsSQL = require('../init/initDoctors');
const { DEV_MODE } = require('../../config/env');

const DOCTOR_PUBLIC_FIELDS =
  'doctor_id, username, first_name, last_name, phone, pfp_link, base_degree_code, postgrad_specialization_code, super_specialization_code, tag_1, tag_2, tag_3, bio, license_no, verified_doctor, banner_link, signature_link, prescription_format, is_deleted, created_at';

const DOCTOR_FIELDS_WITH_NAMES =
  `${DOCTOR_PUBLIC_FIELDS}, base_degree:specializations!base_degree_code(name), postgrad:specializations!postgrad_specialization_code(name), super_spec:specializations!super_specialization_code(name), tag1_ref:tags!tag_1(name), tag2_ref:tags!tag_2(name), tag3_ref:tags!tag_3(name)`;

/**
 * Flatten embedded join objects into simple name fields.
 */
function flattenDoctorNames(doc) {
  return {
    ...doc,
    base_degree_name: doc.base_degree?.name ?? null,
    postgrad_name: doc.postgrad?.name ?? null,
    super_spec_name: doc.super_spec?.name ?? null,
    tag_1_name: doc.tag1_ref?.name ?? null,
    tag_2_name: doc.tag2_ref?.name ?? null,
    tag_3_name: doc.tag3_ref?.name ?? null,
    base_degree: undefined,
    postgrad: undefined,
    super_spec: undefined,
    tag1_ref: undefined,
    tag2_ref: undefined,
    tag3_ref: undefined,
  };
}

/**
 * Returns doctors with optional filters.
 * @param {{ includeDeleted?: boolean, search?: string, username?: string, name?: string, phone?: string }} [opts]
 */
async function getDoctors({ includeDeleted = false, search, username, name, phone } = {}) {
  return withTableGuard(
    async () => {
      let query = supabase.from('doctors').select(DOCTOR_FIELDS_WITH_NAMES);
      if (!includeDeleted) query = query.eq('is_deleted', false);
      if (!DEV_MODE) query = query.not('username', 'ilike', 'e2e_%');

      if (username) query = query.ilike('username', `%${username}%`);
      if (phone) query = query.ilike('phone', `%${phone}%`);
      if (name) {
        query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`);
      }
      if (search) {
        query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(flattenDoctorNames);
    },
    initDoctorsSQL
  );
}

/**
 * Returns a single doctor by doctor_id (regardless of is_deleted).
 * @param {number} doctorId
 */
async function getDoctorById(doctorId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select(DOCTOR_PUBLIC_FIELDS)
        .eq('doctor_id', doctorId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    initDoctorsSQL
  );
}

module.exports = { getDoctors, getDoctorById, DOCTOR_FIELDS_WITH_NAMES, flattenDoctorNames };
