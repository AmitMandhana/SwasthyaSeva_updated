const request = require('supertest');
const express = require('express');

// Mock Supabase (used by getTags)
jest.mock('../db', () => ({ from: jest.fn() }));
jest.mock('../utils/ensureTable', () => ({
  ensureTable: jest.fn().mockResolvedValue(undefined),
  withTableGuard: jest.fn((queryFn) => queryFn()),
}));

// Mock captcha
jest.mock('../utils/captcha', () => ({
  verifyTurnstileToken: jest.fn(),
}));

// Mock rate limiters to pass through
jest.mock('../ratelimits/publicSearch', () => ({
  publicSearchRateLimit: (req, res, next) => next(),
  publicTagsRateLimit: (req, res, next) => next(),
  publicProfileRateLimit: (req, res, next) => next(),
  publicInquiryRateLimit: (req, res, next) => next(),
}));

// Mock pg Pool (used by searchPublicSlots)
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockPool = {
  connect: jest.fn().mockResolvedValue({ query: mockQuery, release: mockRelease }),
  query: mockQuery, end: jest.fn(), on: jest.fn(),
};
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
}));
jest.mock('../utils/pool', () => ({ getPool: jest.fn(() => mockPool) }));

const supabase = require('../db');
const { verifyTurnstileToken } = require('../utils/captcha');

const sampleRow = {
  slot_id: 1,
  slot_fee: 500,
  slot_day: 'MON',
  slot_start: 18,
  slot_end: 24,
  distance_km: 3.45,
  doctor_id: 2,
  doctor_username: 'dr.smith',
  first_name: 'John',
  last_name: 'Smith',
  pfp_link: 'https://example.com/pfp.jpg',
  base_degree_code: 'MBBS',
  postgrad_specialization_code: null,
  super_specialization_code: null,
  tag_1: 'PED',
  tag_2: null,
  tag_3: null,
  bio: 'Experienced doctor',
  base_degree_name: 'Bachelor of Medicine, Bachelor of Surgery',
  postgrad_name: null,
  super_spec_name: null,
  tag_1_name: 'Pediatrician',
  tag_2_name: null,
  tag_3_name: null,
  clinic_id: 5,
  clinic_username: 'testclinic',
  clinic_name: 'Test Clinic',
  street_address: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  location_x: 72.8777,
  location_y: 19.076,
};

let app;
beforeAll(() => {
  app = express();
  app.use(express.json({ limit: '1kb' }));
  const publicRoutes = require('../routes/publicRoutes');
  app.use('/api/public', publicRoutes);
});

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Captcha validation
// ---------------------------------------------------------------------------
describe('POST /api/public/slots/search — captcha', () => {
  test('missing X-Turnstile-Token → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .send({ lat: 19.076, lng: 72.877 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/captcha/i);
  });

  test('invalid captcha token → 400', async () => {
    verifyTurnstileToken.mockResolvedValue(false);
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'bad-token')
      .send({ lat: 19.076, lng: 72.877 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  test('valid captcha → proceeds to search', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    mockQuery.mockResolvedValue({ rows: [sampleRow] });
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid-token')
      .send({ lat: 19.076, lng: 72.877 });
    expect(res.status).toBe(200);
    expect(verifyTurnstileToken).toHaveBeenCalledWith('valid-token', 'slot-search');
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
describe('POST /api/public/slots/search — validation', () => {
  beforeEach(() => verifyTurnstileToken.mockResolvedValue(true));

  test('missing lat/lng → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lat.*lng/i);
  });

  test('lat out of range → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: -91, lng: 72 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lat/i);
  });

  test('lng out of range → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 181 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/lng/i);
  });

  test('tags not an array → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, tags: 'PED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/array/i);
  });

  test('invalid day → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, day: 'HOLIDAY' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/day/i);
  });

  test('timeRanges not array → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, timeRanges: 'MORNING' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/array/i);
  });

  test('invalid timeRange value → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, timeRanges: ['BRUNCH'] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/BRUNCH/i);
  });

  test('valid minimal request → 200', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19.076, lng: 72.877 });
    expect(res.status).toBe(200);
    expect(res.body.slots).toEqual([]);
  });

  test('name not a string → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, name: 123 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  test('name too long → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/100/);
  });
});

// ---------------------------------------------------------------------------
// Search result structure
// ---------------------------------------------------------------------------
describe('POST /api/public/slots/search — results', () => {
  beforeEach(() => verifyTurnstileToken.mockResolvedValue(true));

  test('returns structured slot with doctor and clinic info', async () => {
    mockQuery.mockResolvedValue({ rows: [sampleRow] });
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19.076, lng: 72.877 });
    expect(res.status).toBe(200);
    expect(res.body.slots).toHaveLength(1);

    const slot = res.body.slots[0];
    expect(slot.slot_id).toBe(1);
    expect(slot.slot_fee).toBe(500);
    expect(slot.distance_km).toBeDefined();
    expect(slot.doctor.first_name).toBe('John');
    expect(slot.doctor.last_name).toBe('Smith');
    expect(slot.doctor.base_degree_name).toBe('Bachelor of Medicine, Bachelor of Surgery');
    expect(slot.doctor.tag_1_name).toBe('Pediatrician');
    expect(slot.clinic.clinic_name).toBe('Test Clinic');
    expect(slot.clinic.city).toBe('Mumbai');
    expect(slot.clinic.location_x).toBeDefined();
    expect(slot.clinic.location_y).toBeDefined();
  });

  test('does not include sensitive fields', async () => {
    mockQuery.mockResolvedValue({ rows: [sampleRow] });
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19.076, lng: 72.877 });
    const slot = res.body.slots[0];

    // No sensitive doctor data
    expect(slot.doctor.phone).toBeUndefined();
    expect(slot.doctor.password_hash).toBeUndefined();
    expect(slot.doctor.license_no).toBeUndefined();
    expect(slot.doctor.is_deleted).toBeUndefined();

    // No sensitive clinic data
    expect(slot.clinic.phone).toBeUndefined();
    expect(slot.clinic.password_hash).toBeUndefined();
    expect(slot.clinic.is_deleted).toBeUndefined();
  });

  test('SQL receives correct parameters for filters', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({
        lat: 19.076,
        lng: 72.877,
        tags: ['PED', 'DERM'],
        minFee: 100,
        maxFee: 1000,
        day: 'MON',
        timeRanges: ['MORNING'],
        maxDistanceKm: 25,
      });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    // lat and lng are first two params
    expect(params[0]).toBe(19.076);
    expect(params[1]).toBe(72.877);
    // Tags should be in params
    expect(params).toContain('PED');
    expect(params).toContain('DERM');
    // Fee bounds
    expect(params).toContain(100);
    expect(params).toContain(1000);
    // Day
    expect(params).toContain('MON');
    // Time range bounds for MORNING (12, 17)
    expect(params).toContain(12);
    expect(params).toContain(17);
    // Max distance
    expect(params).toContain(25);
  });

  test('name filter passes ILIKE param and appears 4 times in SQL', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19.076, lng: 72.877, name: 'Smith' });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toContain('%Smith%');
    // $N placeholder must appear exactly 4 times (first, last, concat, clinic_name)
    const nameParamIdx = params.indexOf('%Smith%') + 1; // 1-based
    const placeholder = `$${nameParamIdx}`;
    expect(sql.split(placeholder).length - 1).toBe(4);
    expect(sql).toMatch(/ILIKE/i);
  });

  test('empty name does not add ILIKE to SQL', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19.076, lng: 72.877, name: '' });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toMatch(/ILIKE/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/public/tags
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Multi-day filter
// ---------------------------------------------------------------------------
describe('POST /api/public/slots/search — days filter', () => {
  beforeEach(() => verifyTurnstileToken.mockResolvedValue(true));

  test('days array filters to matching days', async () => {
    mockQuery.mockResolvedValue({ rows: [sampleRow] });
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, days: ['MON', 'WED'] });
    expect(res.status).toBe(200);
    // Verify the query includes ANY(...) param
    const queryCall = mockQuery.mock.calls[0];
    expect(queryCall[0]).toContain('ANY');
    expect(queryCall[1]).toContainEqual(['MON', 'WED']);
  });

  test('invalid day in days array → 400', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, days: ['MON', 'INVALID'] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid day/);
  });

  test('days must be an array', async () => {
    const res = await request(app)
      .post('/api/public/slots/search')
      .set('X-Turnstile-Token', 'valid')
      .send({ lat: 19, lng: 72, days: 'MON' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/days must be an array/);
  });
});

describe('GET /api/public/tags', () => {
  test('returns tags list', async () => {
    const tagData = [
      { tag_code: 'PED', name: 'Pediatrician' },
      { tag_code: 'DERM', name: 'Dermatologist' },
    ];
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: tagData, error: null }),
    });

    const res = await request(app).get('/api/public/tags');
    expect(res.status).toBe(200);
    expect(res.body.tags).toHaveLength(2);
    expect(res.body.tags[0].tag_code).toBe('PED');
  });
});
