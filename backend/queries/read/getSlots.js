const supabase = require('../../db');
const { withTableGuard } = require('../../utils/ensureTable');
const initSlotsSQL = require('../init/initSlots');
const { DEV_MODE } = require('../../config/env');

const SLOT_PUBLIC_FIELDS =
  'slot_id, clinic_id, doctor_id, slot_fee, booking_fee, slot_day, slot_start, slot_end, watermark_url, is_deleted, created_at';

const SLOT_FIELDS_WITH_NAMES =
  `${SLOT_PUBLIC_FIELDS}, doctor:doctors!doctor_id(username, first_name, last_name, tag_1, tag_2, tag_3), clinic:clinics!clinic_id(username, clinic_name, city)`;

/**
 * Flatten embedded join objects into simple name fields.
 */
function flattenSlotNames(slot) {
  return {
    ...slot,
    doctor_username: slot.doctor?.username ?? null,
    doctor_name: slot.doctor
      ? `${slot.doctor.first_name} ${slot.doctor.last_name}`
      : null,
    clinic_username: slot.clinic?.username ?? null,
    clinic_name: slot.clinic?.clinic_name ?? null,
    clinic_city: slot.clinic?.city ?? null,
    doctor: undefined,
    clinic: undefined,
  };
}

/**
 * Returns slots with optional filters.
 * @param {{ includeDeleted?: boolean, clinic_id?: number, doctor_id?: number,
 *           clinic_username?: string, doctor_username?: string, day?: string,
 *           tag?: string }} [opts]
 */
async function getSlots({ includeDeleted = false, clinic_id, doctor_id, clinic_username, doctor_username, day, tag } = {}) {
  return withTableGuard(
    async () => {
      let query = supabase.from('slots').select(SLOT_FIELDS_WITH_NAMES);

      if (!includeDeleted) query = query.eq('is_deleted', false);
      if (!DEV_MODE) query = query.not('doctors.username', 'ilike', 'e2e_%');
      if (clinic_id) query = query.eq('clinic_id', clinic_id);
      if (doctor_id) query = query.eq('doctor_id', doctor_id);
      if (day) query = query.eq('slot_day', day.toUpperCase());

      // Username filters via joined table columns
      if (clinic_username) query = query.ilike('clinics.username', `%${clinic_username}%`);
      if (doctor_username) query = query.ilike('doctors.username', `%${doctor_username}%`);

      // Tag filter: doctor has any tag matching the search
      if (tag) {
        query = query.or(
          `doctors.tag_1.ilike.%${tag}%,doctors.tag_2.ilike.%${tag}%,doctors.tag_3.ilike.%${tag}%`
        );
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(flattenSlotNames);
    },
    initSlotsSQL
  );
}

/**
 * Returns a single slot by slot_id.
 * @param {number} slotId
 */
async function getSlotById(slotId) {
  return withTableGuard(
    async () => {
      const { data, error } = await supabase
        .from('slots')
        .select(SLOT_FIELDS_WITH_NAMES)
        .eq('slot_id', slotId)
        .maybeSingle();

      if (error) throw error;
      return data ? flattenSlotNames(data) : null;
    },
    initSlotsSQL
  );
}

module.exports = { getSlots, getSlotById };
