const { searchPublicSlots, TIME_RANGE_MAP } = require('../../queries/read/searchPublicSlots');
const { verifyTurnstileToken } = require('../../utils/captcha');

const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const VALID_TIME_RANGES = Object.keys(TIME_RANGE_MAP);

/**
 * POST /api/public/slots/search
 * Headers: X-Turnstile-Token
 * Body: { lat, lng, tags?, maxDistanceKm?, minFee?, maxFee?, timeRanges?, day?, name? }
 */
async function publicSlotSearchHandler(req, res) {
  // 1. Verify Turnstile captcha from header
  const turnstileToken = req.headers['x-turnstile-token'];
  if (!turnstileToken) {
    return res.status(400).json({ error: 'Bad Request', message: 'Missing captcha token' });
  }

  const captchaValid = await verifyTurnstileToken(turnstileToken, 'slot-search');
  if (!captchaValid) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired captcha' });
  }

  // 2. Validate body params
  const { lat, lng, tags, maxDistanceKm, minFee, maxFee, timeRanges, day, days, name } = req.body || {};

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'Bad Request', message: 'lat and lng are required' });
  }

  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return res.status(400).json({ error: 'Bad Request', message: 'lat must be between -90 and 90' });
  }
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return res.status(400).json({ error: 'Bad Request', message: 'lng must be between -180 and 180' });
  }

  if (tags != null && !Array.isArray(tags)) {
    return res.status(400).json({ error: 'Bad Request', message: 'tags must be an array' });
  }

  if (day != null && !VALID_DAYS.includes(String(day).toUpperCase())) {
    return res.status(400).json({ error: 'Bad Request', message: `day must be one of: ${VALID_DAYS.join(', ')}` });
  }

  if (days != null) {
    if (!Array.isArray(days)) {
      return res.status(400).json({ error: 'Bad Request', message: 'days must be an array' });
    }
    for (const d of days) {
      if (!VALID_DAYS.includes(String(d).toUpperCase())) {
        return res.status(400).json({ error: 'Bad Request', message: `Invalid day: ${d}. Valid: ${VALID_DAYS.join(', ')}` });
      }
    }
  }

  if (timeRanges != null) {
    if (!Array.isArray(timeRanges)) {
      return res.status(400).json({ error: 'Bad Request', message: 'timeRanges must be an array' });
    }
    for (const tr of timeRanges) {
      if (!VALID_TIME_RANGES.includes(String(tr).toUpperCase())) {
        return res.status(400).json({ error: 'Bad Request', message: `Invalid time range: ${tr}. Valid: ${VALID_TIME_RANGES.join(', ')}` });
      }
    }
  }

  if (name != null) {
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'name must be a string' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Bad Request', message: 'name must be 100 characters or fewer' });
    }
  }

  // 3. Search
  try {
    const slots = await searchPublicSlots({
      tags: tags || undefined,
      lat: latNum,
      lng: lngNum,
      maxDistanceKm: maxDistanceKm != null ? Number(maxDistanceKm) : undefined,
      minFee: minFee != null ? Number(minFee) : undefined,
      maxFee: maxFee != null ? Number(maxFee) : undefined,
      timeRanges: timeRanges || undefined,
      day: day || undefined,
      days: days || undefined,
      name: name != null ? name : undefined,
    });

    return res.status(200).json({ slots });
  } catch (err) {
    console.error('[PublicSlotSearch] ERROR', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = { publicSlotSearchHandler };
