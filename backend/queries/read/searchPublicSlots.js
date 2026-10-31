const { getPool } = require('../../utils/pool');
require('dotenv').config();
const { DEV_MODE } = require('../../config/env');

let pool = null;


/**
 * Time range name → slot_start intervals
 */
const TIME_RANGE_MAP = {
  MIDNIGHT:       [0,  5],   // 0:00 – 2:30
  EARLY_MORNING:  [6,  11],  // 3:00 – 5:30
  MORNING:        [12, 17],  // 6:00 – 8:30
  DAY:            [18, 23],  // 9:00 – 11:30
  NOON:           [24, 29],  // 12:00 – 14:30
  AFTERNOON:      [30, 35],  // 15:00 – 17:30
  EVENING:        [36, 41],  // 18:00 – 20:30
  NIGHT:          [42, 47],  // 21:00 – 23:30
};

/**
 * Search public slots with Haversine distance, filtering, and joins.
 *
 * Only returns slots where:
 *  - slot.is_deleted = false
 *  - doctor.is_deleted = false
 *  - doctor.verified_doctor = true
 *  - clinic.is_deleted = false
 *
 * @param {{ tags?: string[], lat: number, lng: number, maxDistanceKm?: number,
 *           minFee?: number, maxFee?: number, timeRanges?: string[], day?: string,
 *           name?: string }} opts
 * @returns {Promise<object[]>}
 */
async function searchPublicSlots({ tags, lat, lng, maxDistanceKm = 50, minFee, maxFee, timeRanges, day, days, name } = {}) {
  const params = [lat, lng];
  let paramIdx = 3;

  // Build WHERE clauses
  const conditions = [
    's.is_deleted = false',
    'd.is_deleted = false',
    'd.verified_doctor = true',
    'c.is_deleted = false',
  ];
  if (!DEV_MODE) conditions.push("d.username NOT ILIKE 'e2e_%'");

  // Tag filter: doctor has at least one matching tag
  if (tags && tags.length > 0) {
    const tagPlaceholders = tags.map(() => `$${paramIdx++}`);
    params.push(...tags);
    conditions.push(`(d.tag_1 IN (${tagPlaceholders.join(',')}) OR d.tag_2 IN (${tagPlaceholders.join(',')}) OR d.tag_3 IN (${tagPlaceholders.join(',')}))`);
  }

  // Fee range filter
  if (minFee != null) {
    conditions.push(`s.slot_fee >= $${paramIdx++}`);
    params.push(minFee);
  }
  if (maxFee != null) {
    conditions.push(`s.slot_fee <= $${paramIdx++}`);
    params.push(maxFee);
  }

  // Day filter (single or multiple)
  if (days && days.length > 0) {
    conditions.push(`s.slot_day = ANY($${paramIdx++}::text[])`);
    params.push(days.map(d => d.toUpperCase()));
  } else if (day) {
    conditions.push(`s.slot_day = $${paramIdx++}`);
    params.push(day.toUpperCase());
  }

  // Name filter: matches doctor first name, last name, full name, or clinic name
  if (name && name.trim()) {
    const trimmed = name.trim();
    conditions.push(
      `(d.first_name ILIKE $${paramIdx} OR d.last_name ILIKE $${paramIdx}` +
      ` OR CONCAT(d.first_name, ' ', d.last_name) ILIKE $${paramIdx}` +
      ` OR c.clinic_name ILIKE $${paramIdx})`
    );
    params.push(`%${trimmed}%`);
    paramIdx++;
  }

  // Time range filter: OR of multiple ranges
  if (timeRanges && timeRanges.length > 0) {
    const rangeClauses = [];
    for (const range of timeRanges) {
      const bounds = TIME_RANGE_MAP[range.toUpperCase()];
      if (!bounds) continue;
      rangeClauses.push(`(s.slot_start >= $${paramIdx++} AND s.slot_start <= $${paramIdx++})`);
      params.push(bounds[0], bounds[1]);
    }
    if (rangeClauses.length > 0) {
      conditions.push(`(${rangeClauses.join(' OR ')})`);
    }
  }

  const whereClause = conditions.join(' AND ');

  const distParam = `$${paramIdx++}`;
  const sql = `
    SELECT * FROM (
      SELECT
        s.slot_id, s.slot_fee, s.booking_fee, s.slot_day, s.slot_start, s.slot_end,
        d.doctor_id, d.username AS doctor_username, d.first_name, d.last_name,
        d.pfp_link, d.base_degree_code, d.postgrad_specialization_code,
        d.super_specialization_code, d.tag_1, d.tag_2, d.tag_3, d.bio,
        bd.name AS base_degree_name,
        pg.name AS postgrad_name,
        ss.name AS super_spec_name,
        t1.name AS tag_1_name,
        t2.name AS tag_2_name,
        t3.name AS tag_3_name,
        c.clinic_id, c.username AS clinic_username, c.clinic_name, c.phone AS clinic_phone, c.street_address, c.city, c.state,
        c.location_x, c.location_y,
        (6371 * acos(
          LEAST(1, GREATEST(-1,
            cos(radians($1)) * cos(radians(c.location_y)) *
            cos(radians(c.location_x) - radians($2)) +
            sin(radians($1)) * sin(radians(c.location_y))
          ))
        )) AS distance_km
      FROM slots s
      JOIN doctors d ON s.doctor_id = d.doctor_id
      JOIN clinics c ON s.clinic_id = c.clinic_id
      LEFT JOIN specializations bd ON d.base_degree_code = bd.specialization_code
      LEFT JOIN specializations pg ON d.postgrad_specialization_code = pg.specialization_code
      LEFT JOIN specializations ss ON d.super_specialization_code = ss.specialization_code
      LEFT JOIN tags t1 ON d.tag_1 = t1.tag_code
      LEFT JOIN tags t2 ON d.tag_2 = t2.tag_code
      LEFT JOIN tags t3 ON d.tag_3 = t3.tag_code
      WHERE ${whereClause}
    ) sub
    WHERE distance_km <= ${distParam}
    ORDER BY distance_km ASC
    LIMIT 100
  `;
  params.push(maxDistanceKm);

  const client = await getPool().connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows.map((r) => ({
      slot_id: r.slot_id,
      slot_fee: r.slot_fee,
      booking_fee: r.booking_fee,
      slot_day: r.slot_day,
      slot_start: r.slot_start,
      slot_end: r.slot_end,
      distance_km: Math.round(r.distance_km * 100) / 100,
      doctor: {
        doctor_id: r.doctor_id,
        username: r.doctor_username,
        first_name: r.first_name,
        last_name: r.last_name,
        pfp_link: r.pfp_link,
        base_degree_name: r.base_degree_name,
        postgrad_name: r.postgrad_name,
        super_spec_name: r.super_spec_name,
        tag_1_name: r.tag_1_name,
        tag_2_name: r.tag_2_name,
        tag_3_name: r.tag_3_name,
        bio: r.bio,
      },
      clinic: {
        clinic_id: r.clinic_id,
        username: r.clinic_username,
        clinic_name: r.clinic_name,
        phone: r.clinic_phone,
        street_address: r.street_address,
        city: r.city,
        state: r.state,
        location_x: r.location_x,
        location_y: r.location_y,
      },
    }));
  } finally {
    client.release();
  }
}

module.exports = { searchPublicSlots, TIME_RANGE_MAP };
