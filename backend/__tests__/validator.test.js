// Set up test environment
process.env.PII_SECRET = 'test-secret-key-for-validator-tests-minimum-32-characters-long';

const validateWithSchema = require('../validators/validator');
const { encrypt, decrypt } = require('../utils/pii');

// Mock field validators for testing
const mockStringField = {
  normalize: (v) => typeof v === 'string' ? v.trim() : v,
  validate: (v) => typeof v !== 'string' ? 'Must be a string' : null,
};

const mockNumberField = {
  normalize: (v) => typeof v === 'string' ? Number(v) : v,
  validate: (v) => typeof v !== 'number' ? 'Must be a number' : null,
};

const mockBooleanField = {
  normalize: (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1) return true;
    if (v === 'false' || v === 0) return false;
    return v;
  },
  validate: (v) => typeof v !== 'boolean' ? 'Must be a boolean' : null,
};

const mockPIIField = {
  isPII: true,
  normalize: (v) => typeof v === 'string' ? v.trim().toLowerCase() : v,
  validate: (v) => typeof v !== 'string' ? 'Must be a string' : null,
};

describe('validateWithSchema - core functionality', () => {
  test('validates required fields', () => {
    const schema = {
      name: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, {});
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ field: 'name', message: 'name is required' });
  });

  test('validates optional fields when present', () => {
    const schema = {
      name: { required: false, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { name: 123 });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ field: 'name', message: 'Must be a string' });
  });

  test('skips validation for optional absent fields', () => {
    const schema = {
      name: { required: false, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, {});
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data.name).toBeNull();
  });

  test('normalizes values', () => {
    const schema = {
      name: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { name: '  John  ' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('John');
  });

  test('returns multiple errors for multiple invalid fields', () => {
    const schema = {
      name: { required: true, ...mockStringField },
      age: { required: true, ...mockNumberField },
    };
    
    const result = validateWithSchema(schema, {});
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.map(e => e.field)).toContain('name');
    expect(result.errors.map(e => e.field)).toContain('age');
  });
});

describe('validateWithSchema - falsy value handling', () => {
  test('treats 0 as present value', () => {
    const schema = {
      count: { required: true, ...mockNumberField },
    };
    
    const result = validateWithSchema(schema, { count: 0 });
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(0);
  });

  test('treats false as present value', () => {
    const schema = {
      active: { required: true, ...mockBooleanField },
    };
    
    const result = validateWithSchema(schema, { active: false });
    expect(result.success).toBe(true);
    expect(result.data.active).toBe(false);
  });

  test('treats empty string as absent', () => {
    const schema = {
      name: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { name: '' });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toEqual({ field: 'name', message: 'name is required' });
  });

  test('treats null as absent', () => {
    const schema = {
      name: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { name: null });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toEqual({ field: 'name', message: 'name is required' });
  });

  test('treats undefined as absent', () => {
    const schema = {
      name: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { name: undefined });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toEqual({ field: 'name', message: 'name is required' });
  });
});

describe('validateWithSchema - encryptPII option', () => {
  test('encrypts PII fields by default', () => {
    const schema = {
      email: { required: true, ...mockPIIField },
    };
    
    const result = validateWithSchema(schema, { email: 'TEST@EXAMPLE.COM' });
    expect(result.success).toBe(true);
    expect(result.data.email).not.toBe('test@example.com');
    expect(decrypt(result.data.email)).toBe('test@example.com');
  });

  test('skips PII encryption when encryptPII: false', () => {
    const schema = {
      email: { required: true, ...mockPIIField },
    };
    
    const result = validateWithSchema(schema, { email: 'TEST@EXAMPLE.COM' }, { encryptPII: false });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('test@example.com');
  });

  test('encrypts only PII fields, not regular fields', () => {
    const schema = {
      email: { required: true, ...mockPIIField },
      username: { required: true, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, { email: 'test@example.com', username: '  JohnDoe  ' });
    expect(result.success).toBe(true);
    expect(result.data.username).toBe('JohnDoe');
    expect(decrypt(result.data.email)).toBe('test@example.com');
  });
});

describe('validateWithSchema - onlyPresent option', () => {
  test('processes all schema fields by default', () => {
    const schema = {
      name: { required: false, ...mockStringField },
      age: { required: false, ...mockNumberField },
    };
    
    const result = validateWithSchema(schema, { name: 'John' });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('age');
    expect(result.data.age).toBeNull();
  });

  test('only processes present fields when onlyPresent: true', () => {
    const schema = {
      name: { required: false, ...mockStringField },
      age: { required: false, ...mockNumberField },
    };
    
    const result = validateWithSchema(schema, { name: 'John' }, { onlyPresent: true });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('name');
    expect(result.data).not.toHaveProperty('age');
  });

  test('validates only present fields when onlyPresent: true', () => {
    const schema = {
      name: { required: false, ...mockStringField },
      age: { required: false, ...mockNumberField },
    };
    
    const result = validateWithSchema(schema, { name: 123 }, { onlyPresent: true });
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('name');
  });

  test('onlyPresent with encryptPII: false works together', () => {
    const schema = {
      email: { required: false, ...mockPIIField },
      username: { required: false, ...mockStringField },
    };
    
    const result = validateWithSchema(
      schema,
      { email: 'TEST@EXAMPLE.COM' },
      { onlyPresent: true, encryptPII: false }
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('email');
    expect(result.data).not.toHaveProperty('username');
    expect(result.data.email).toBe('test@example.com');
  });
});

describe('validateWithSchema - edge cases', () => {
  test('handles null rawInput', () => {
    const schema = {
      name: { required: false, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, null);
    expect(result.success).toBe(true);
    expect(result.data.name).toBeNull();
  });

  test('handles undefined rawInput', () => {
    const schema = {
      name: { required: false, ...mockStringField },
    };
    
    const result = validateWithSchema(schema, undefined);
    expect(result.success).toBe(true);
    expect(result.data.name).toBeNull();
  });

  test('handles empty schema', () => {
    const result = validateWithSchema({}, { name: 'John' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });
});
