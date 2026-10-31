// Set up test environment
process.env.PII_SECRET = 'test-secret-key-for-schema-tests-minimum-32-characters-long';

const validateWithSchema = require('../validators/validator');
const createDoctorSchema = require('../validators/schemas/createDoctorSchema');
const updateDoctorSchema = require('../validators/schemas/updateDoctorSchema');
const createClinicSchema = require('../validators/schemas/createClinicSchema');
const updateClinicSchema = require('../validators/schemas/updateClinicSchema');
const createClinicManagerSchema = require('../validators/schemas/createClinicManagerSchema');
const updateClinicManagerSchema = require('../validators/schemas/updateClinicManagerSchema');
const adminLoginSchema = require('../validators/schemas/adminLoginSchema');
const createSlotSchema = require('../validators/schemas/createSlotSchema');
const updateSlotSchema = require('../validators/schemas/updateSlotSchema');

describe('createDoctorSchema', () => {
  test('validates complete valid payload', () => {
    const payload = {
      username: 'dr.smith',
      first_name: 'John',
      last_name: 'Smith',
      phone: '9999999999',
      base_degree_code: 'MBBS',
      license_no: 'LIC-001',
      pfp_link: 'https://example.com/pic.jpg',
      bio: 'Experienced doctor',
      verified_doctor: true,
    };
    
    const result = validateWithSchema(createDoctorSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.username).toBe('dr.smith');
    expect(result.data.first_name).toBe('John');
    expect(result.data.phone).toBe('+919999999999');
  });

  test('rejects missing required fields', () => {
    const result = validateWithSchema(createDoctorSchema, {}, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.map(e => e.field)).toContain('username');
    expect(result.errors.map(e => e.field)).toContain('first_name');
    expect(result.errors.map(e => e.field)).toContain('license_no');
  });

  test('accepts payload with only required fields', () => {
    const payload = {
      username: 'dr.smith',
      first_name: 'John',
      last_name: 'Smith',
      phone: '9999999999',
      base_degree_code: 'MBBS',
      license_no: 'LIC-001',
    };
    
    const result = validateWithSchema(createDoctorSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
  });

  test('normalizes phone number', () => {
    const payload = {
      username: 'dr.smith',
      first_name: 'John',
      last_name: 'Smith',
      phone: '9999999999',
      base_degree_code: 'MBBS',
      license_no: 'LIC-001',
    };
    
    const result = validateWithSchema(createDoctorSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.phone).toBe('+919999999999');
  });

  test('preserves username case', async () => {
    const result = validateWithSchema(createDoctorSchema, {
      username: 'DR.SMITH',
      first_name: 'John',
      last_name: 'Doe',
      phone: '9876543210',
      base_degree_code: 'MBBS',
      license_no: 'LIC001',
      password: 'SecurePass123!@#',
    }, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.username).toBe('DR.SMITH');
  });

  test('rejects invalid types', () => {
    const payload = {
      username: 123,
      first_name: 'John',
      last_name: 'Smith',
      phone: '9999999999',
      base_degree_code: 'MBBS',
      license_no: 'LIC-001',
    };
    
    const result = validateWithSchema(createDoctorSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('username');
  });

  test('does not encrypt PII when encryptPII: false', () => {
    const payload = {
      username: 'dr.smith',
      first_name: 'John',
      last_name: 'Smith',
      phone: '9999999999',
      base_degree_code: 'MBBS',
      license_no: 'LIC-001',
    };
    
    const result = validateWithSchema(createDoctorSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.phone).toBe('+919999999999');
    expect(result.data.first_name).toBe('John');
  });
});

describe('updateDoctorSchema', () => {
  test('validates partial update with onlyPresent', () => {
    const payload = { bio: 'Updated bio' };
    
    const result = validateWithSchema(updateDoctorSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('bio');
    expect(result.data).not.toHaveProperty('first_name');
  });

  test('accepts empty payload with onlyPresent', () => {
    const result = validateWithSchema(updateDoctorSchema, {}, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(Object.keys(result.data)).toHaveLength(0);
  });

  test('validates multiple fields', () => {
    const payload = {
      first_name: 'Jane',
      phone: '8888888888',
      verified_doctor: false,
    };
    
    const result = validateWithSchema(updateDoctorSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data.first_name).toBe('Jane');
    expect(result.data.phone).toBe('+918888888888');
    expect(result.data.verified_doctor).toBe(false);
  });
});

describe('createClinicSchema', () => {
  test('validates complete valid payload', () => {
    const payload = {
      username: 'cityclinic',
      phone: '9000000000',
      license_no: 'CLN001',
      pfp_link: 'https://example.com/pfp.jpg',
      banner_link: 'https://example.com/banner.jpg',
      street_address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      location_x: 72.8777,
      location_y: 19.0760,
      clinic_name: 'City Clinic',
      verified: true,
    };

    const result = validateWithSchema(createClinicSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.phone).toBe('+919000000000');
    expect(result.data.state).toBe('Maharashtra');
  });

  test('rejects missing required fields', () => {
    const result = validateWithSchema(createClinicSchema, {}, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors.map(e => e.field)).toContain('username');
    expect(result.errors.map(e => e.field)).toContain('phone');
    expect(result.errors.map(e => e.field)).toContain('street_address');
  });

  test('normalizes state name to code', () => {
    const payload = {
      username: 'cityclinic',
      phone: '9000000000',
      license_no: 'CLN001',
      pfp_link: 'https://example.com/pfp.jpg',
      banner_link: 'https://example.com/banner.jpg',
      street_address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      location_x: 72.8777,
      location_y: 19.0760,
    };

    const result = validateWithSchema(createClinicSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.state).toBe('Maharashtra');
  });

  test('normalizes city to title case', () => {
    const payload = {
      username: 'cityclinic',
      phone: '9000000000',
      license_no: 'CLN001',
      pfp_link: 'https://example.com/pfp.jpg',
      banner_link: 'https://example.com/banner.jpg',
      street_address: '123 Main St',
      city: 'mumbai',
      state: 'mh',
      pincode: '400001',
      location_x: 72.8777,
      location_y: 19.0760,
    };

    const result = validateWithSchema(createClinicSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.city).toBe('Mumbai');
  });

  test('validates location coordinates', () => {
    const payload = {
      username: 'cityclinic',
      phone: '9000000000',
      license_no: 'CLN001',
      pfp_link: 'https://example.com/pfp.jpg',
      banner_link: 'https://example.com/banner.jpg',
      street_address: '123 Main St',
      city: 'Mumbai',
      state: 'mh',
      location_x: 200,
      location_y: 19.0760,
    };
    
    const result = validateWithSchema(createClinicSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors.map(e => e.field)).toContain('location_x');
  });
});

describe('updateClinicSchema', () => {
  test('validates partial update', () => {
    const payload = { clinic_name: 'New Name', verified: true };
    
    const result = validateWithSchema(updateClinicSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data.clinic_name).toBe('New Name');
    expect(result.data.verified).toBe(true);
  });

  test('rejects clinic_name exceeding 20 chars', () => {
    const payload = { clinic_name: 'A'.repeat(21) };
    
    const result = validateWithSchema(updateClinicSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('clinic_name');
  });
});

describe('createClinicManagerSchema', () => {
  test('validates complete valid payload', () => {
    const payload = {
      clinic_id: 5,
      name: 'Alice Manager',
      username: 'alice.mgr',
      phone: '8888888888',
      pfp_link: 'https://example.com/pic.jpg',
    };
    
    const result = validateWithSchema(createClinicManagerSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.clinic_id).toBe(5);
    expect(result.data.username).toBe('alice.mgr');
  });

  test('rejects missing required fields', () => {
    const result = validateWithSchema(createClinicManagerSchema, {}, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors.map(e => e.field)).toContain('clinic_id');
    expect(result.errors.map(e => e.field)).toContain('name');
    expect(result.errors.map(e => e.field)).toContain('username');
  });

  test('parses string clinic_id to integer', () => {
    const payload = {
      clinic_id: '5',
      name: 'Alice Manager',
      username: 'alice.mgr',
      phone: '8888888888',
    };
    
    const result = validateWithSchema(createClinicManagerSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.clinic_id).toBe(5);
    expect(typeof result.data.clinic_id).toBe('number');
  });

  test('rejects negative clinic_id', () => {
    const payload = {
      clinic_id: -1,
      name: 'Alice Manager',
      username: 'alice.mgr',
      phone: '8888888888',
    };
    
    const result = validateWithSchema(createClinicManagerSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('clinic_id');
  });
});

describe('updateClinicManagerSchema', () => {
  test('validates partial update', () => {
    const payload = { phone: '7777777777' };
    
    const result = validateWithSchema(updateClinicManagerSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data.phone).toBe('+917777777777');
  });
});

describe('adminLoginSchema', () => {
  test('validates valid credentials', () => {
    const payload = {
      username: 'admin',
      password: 'somepassword',
    };
    
    const result = validateWithSchema(adminLoginSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.username).toBe('admin');
    expect(result.data.password).toBe('somepassword');
  });

  test('rejects missing username', () => {
    const payload = { password: 'somepassword' };
    
    const result = validateWithSchema(adminLoginSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('username');
  });

  test('rejects missing password', () => {
    const payload = { username: 'admin' };
    
    const result = validateWithSchema(adminLoginSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('password');
  });

  test('rejects empty password', () => {
    const payload = { username: 'admin', password: '' };
    
    const result = validateWithSchema(adminLoginSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('password');
  });

  test('does not enforce password complexity for login', () => {
    const payload = { username: 'admin', password: 'short' };

    const result = validateWithSchema(adminLoginSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
  });
});

describe('createSlotSchema', () => {
  test('validates complete valid payload', () => {
    const payload = {
      clinic_id: 1,
      doctor_id: 2,
      slot_fee: 500,
      slot_day: 'MON',
      slot_start: 18,
      slot_end: 24,
    };

    const result = validateWithSchema(createSlotSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.clinic_id).toBe(1);
    expect(result.data.doctor_id).toBe(2);
    expect(result.data.slot_fee).toBe(500);
    expect(result.data.slot_day).toBe('MON');
    expect(result.data.slot_start).toBe(18);
    expect(result.data.slot_end).toBe(24);
  });

  test('rejects missing required fields', () => {
    const result = validateWithSchema(createSlotSchema, {}, { encryptPII: false });
    expect(result.success).toBe(false);
    const fields = result.errors.map(e => e.field);
    expect(fields).toContain('clinic_id');
    expect(fields).toContain('doctor_id');
    expect(fields).toContain('slot_fee');
    expect(fields).toContain('slot_day');
    expect(fields).toContain('slot_start');
    expect(fields).toContain('slot_end');
  });

  test('normalizes string values to correct types', () => {
    const payload = {
      clinic_id: '1',
      doctor_id: '2',
      slot_fee: '500',
      slot_day: 'mon',
      slot_start: '18',
      slot_end: '24',
    };

    const result = validateWithSchema(createSlotSchema, payload, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.clinic_id).toBe(1);
    expect(result.data.doctor_id).toBe(2);
    expect(result.data.slot_fee).toBe(500);
    expect(result.data.slot_day).toBe('MON');
    expect(result.data.slot_start).toBe(18);
    expect(result.data.slot_end).toBe(24);
  });

  test('rejects invalid slot_day', () => {
    const payload = {
      clinic_id: 1,
      doctor_id: 2,
      slot_fee: 500,
      slot_day: 'HOLIDAY',
      slot_start: 18,
      slot_end: 24,
    };

    const result = validateWithSchema(createSlotSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('slot_day');
  });

  test('rejects slot_start out of range', () => {
    const payload = {
      clinic_id: 1,
      doctor_id: 2,
      slot_fee: 500,
      slot_day: 'MON',
      slot_start: 48,
      slot_end: 24,
    };

    const result = validateWithSchema(createSlotSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors.map(e => e.field)).toContain('slot_start');
  });

  test('rejects zero slot_fee', () => {
    const payload = {
      clinic_id: 1,
      doctor_id: 2,
      slot_fee: 0,
      slot_day: 'MON',
      slot_start: 18,
      slot_end: 24,
    };

    const result = validateWithSchema(createSlotSchema, payload, { encryptPII: false });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('slot_fee');
  });
});

describe('updateSlotSchema', () => {
  test('accepts empty payload with onlyPresent', () => {
    const result = validateWithSchema(updateSlotSchema, {}, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(Object.keys(result.data)).toHaveLength(0);
  });

  test('validates partial update — single field', () => {
    const payload = { slot_fee: 300 };

    const result = validateWithSchema(updateSlotSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data.slot_fee).toBe(300);
    expect(result.data).not.toHaveProperty('clinic_id');
  });

  test('validates partial update — multiple fields', () => {
    const payload = { slot_day: 'fri', slot_start: 12, slot_end: 18 };

    const result = validateWithSchema(updateSlotSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data.slot_day).toBe('FRI');
    expect(result.data.slot_start).toBe(12);
    expect(result.data.slot_end).toBe(18);
  });

  test('rejects invalid values in partial update', () => {
    const payload = { slot_fee: -5 };

    const result = validateWithSchema(updateSlotSchema, payload, { encryptPII: false, onlyPresent: true });
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('slot_fee');
  });
});
