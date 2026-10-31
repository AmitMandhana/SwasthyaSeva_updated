const username = require('../validators/fields/username');
const bio = require('../validators/fields/bio');
const licenseNo = require('../validators/fields/licenseNo');
const url = require('../validators/fields/url');
const code = require('../validators/fields/code');
const booleanField = require('../validators/fields/booleanField');
const positiveInteger = require('../validators/fields/positiveInteger');
const clinicName = require('../validators/fields/clinicName');
const slotDay = require('../validators/fields/slotDay');
const slotTime = require('../validators/fields/slotTime');
const slotFee = require('../validators/fields/slotFee');

describe('username field validator', () => {
  test('trims whitespace but preserves case', () => {
    expect(username.normalize('  JohnDoe123  ')).toBe('JohnDoe123');
    expect(username.normalize('JOHN_DOE')).toBe('JOHN_DOE');
  });

  test('accepts valid usernames', () => {
    expect(username.validate(username.normalize('dr.smith'))).toBeNull();
    expect(username.validate(username.normalize('user_123'))).toBeNull();
    expect(username.validate(username.normalize('john-doe'))).toBeNull();
    expect(username.validate(username.normalize('abc'))).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(username.validate(123)).toMatch(/string/);
    expect(username.validate(null)).toMatch(/string/);
    expect(username.validate(undefined)).toMatch(/string/);
  });

  test('rejects too short usernames', () => {
    expect(username.validate('ab')).toMatch(/at least 3/);
  });

  test('rejects too long usernames', () => {
    expect(username.validate('a'.repeat(51))).toMatch(/at most 50/);
  });

  test('rejects invalid characters', () => {
    expect(username.validate('user@name')).toMatch(/only letters/);
    expect(username.validate('user name')).toMatch(/only letters/);
    expect(username.validate('user#123')).toMatch(/only letters/);
  });

  test('handles empty string', () => {
    expect(username.validate('')).toMatch(/non-empty/);
  });
});

describe('bio field validator', () => {
  test('trims whitespace', () => {
    expect(bio.normalize('  Some bio text  ')).toBe('Some bio text');
  });

  test('accepts valid bio', () => {
    expect(bio.validate('Experienced doctor with 10 years in cardiology.')).toBeNull();
    expect(bio.validate('a')).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(bio.validate(123)).toMatch(/string/);
    expect(bio.validate(null)).toMatch(/string/);
  });

  test('rejects too long bio', () => {
    expect(bio.validate('a'.repeat(501))).toMatch(/at most 500/);
  });

  test('accepts bio at max length', () => {
    expect(bio.validate('a'.repeat(500))).toBeNull();
  });

  test('handles empty string', () => {
    expect(bio.validate('')).toMatch(/non-empty/);
  });
});

describe('licenseNo field validator', () => {
  test('normalizes by trimming', () => {
    expect(licenseNo.normalize('  lic-123  ')).toBe('lic-123');
    expect(licenseNo.normalize('abc123')).toBe('abc123');
  });

  test('accepts valid license numbers', () => {
    expect(licenseNo.validate(licenseNo.normalize('LIC-001'))).toBeNull();
    expect(licenseNo.validate(licenseNo.normalize('ABC123'))).toBeNull();
    expect(licenseNo.validate(licenseNo.normalize('12345'))).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(licenseNo.validate(123)).toMatch(/string/);
    expect(licenseNo.validate(null)).toMatch(/string/);
  });

  test('rejects too long license numbers', () => {
    expect(licenseNo.validate('A'.repeat(51))).toMatch(/at most 50/);
  });

  test('accepts various formats', () => {
    expect(licenseNo.validate('LIC_001')).toBeNull();
    expect(licenseNo.validate('LIC.001')).toBeNull();
    expect(licenseNo.validate('LIC 001')).toBeNull();
  });

  test('handles empty string', () => {
    expect(licenseNo.validate('')).toMatch(/non-empty/);
  });
});

describe('url field validator', () => {
  test('trims whitespace', () => {
    expect(url.normalize('  https://example.com  ')).toBe('https://example.com');
  });

  test('accepts valid URLs', () => {
    expect(url.validate('https://example.com')).toBeNull();
    expect(url.validate('http://example.com/path')).toBeNull();
    expect(url.validate('https://example.com/path?query=1')).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(url.validate(123)).toMatch(/string/);
    expect(url.validate(null)).toMatch(/string/);
  });

  test('rejects too long URLs', () => {
    expect(url.validate('https://' + 'a'.repeat(100))).toMatch(/at most 100/);
  });

  test('rejects URLs without protocol', () => {
    expect(url.validate('example.com')).toMatch(/valid URL/);
    expect(url.validate('www.example.com')).toMatch(/valid URL/);
  });

  test('rejects invalid protocols', () => {
    expect(url.validate('ftp://example.com')).toMatch(/valid URL/);
  });

  test('handles empty string', () => {
    expect(url.validate('')).toMatch(/non-empty/);
  });
});

describe('code field validator', () => {
  test('normalizes to uppercase and trims', () => {
    expect(code.normalize('  mbbs  ')).toBe('MBBS');
    expect(code.normalize('md_gen_med')).toBe('MD_GEN_MED');
  });

  test('accepts valid codes', () => {
    expect(code.validate(code.normalize('MBBS'))).toBeNull();
    expect(code.validate(code.normalize('MD_GEN_MED'))).toBeNull();
    expect(code.validate(code.normalize('TAG_1'))).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(code.validate(123)).toMatch(/string/);
    expect(code.validate(null)).toMatch(/string/);
  });

  test('rejects too long codes', () => {
    expect(code.validate('A'.repeat(51))).toMatch(/at most 50/);
  });

  test('rejects invalid characters', () => {
    expect(code.validate('MD-GEN-MED')).toMatch(/only uppercase/);
    expect(code.validate('MD.GEN.MED')).toMatch(/only uppercase/);
    expect(code.validate('MD GEN MED')).toMatch(/only uppercase/);
  });

  test('handles empty string', () => {
    expect(code.validate('')).toMatch(/non-empty/);
  });
});

describe('booleanField validator', () => {
  test('normalizes string "true" to boolean', () => {
    expect(booleanField.normalize('true')).toBe(true);
    expect(booleanField.normalize('false')).toBe(false);
  });

  test('normalizes number 1/0 to boolean', () => {
    expect(booleanField.normalize(1)).toBe(true);
    expect(booleanField.normalize(0)).toBe(false);
    expect(booleanField.normalize('1')).toBe(true);
    expect(booleanField.normalize('0')).toBe(false);
  });

  test('keeps boolean values as-is', () => {
    expect(booleanField.normalize(true)).toBe(true);
    expect(booleanField.normalize(false)).toBe(false);
  });

  test('accepts valid booleans', () => {
    expect(booleanField.validate(true)).toBeNull();
    expect(booleanField.validate(false)).toBeNull();
  });

  test('rejects non-boolean values after normalization', () => {
    expect(booleanField.validate('yes')).toMatch(/boolean/);
    expect(booleanField.validate('no')).toMatch(/boolean/);
    expect(booleanField.validate(2)).toMatch(/boolean/);
    expect(booleanField.validate(null)).toMatch(/boolean/);
  });
});

describe('positiveInteger validator', () => {
  test('normalizes string numbers to integers', () => {
    expect(positiveInteger.normalize('123')).toBe(123);
    expect(positiveInteger.normalize('1')).toBe(1);
  });

  test('keeps integers as-is', () => {
    expect(positiveInteger.normalize(123)).toBe(123);
  });

  test('handles invalid string numbers', () => {
    expect(positiveInteger.normalize('abc')).toBe('abc');
    expect(positiveInteger.normalize('12.5')).toBe(12);
  });

  test('accepts valid positive integers', () => {
    expect(positiveInteger.validate(1)).toBeNull();
    expect(positiveInteger.validate(100)).toBeNull();
    expect(positiveInteger.validate(999999)).toBeNull();
  });

  test('rejects non-numbers', () => {
    expect(positiveInteger.validate('123')).toMatch(/number/);
    expect(positiveInteger.validate(null)).toMatch(/number/);
  });

  test('rejects floats', () => {
    expect(positiveInteger.validate(12.5)).toMatch(/integer/);
  });

  test('rejects zero and negative numbers', () => {
    expect(positiveInteger.validate(0)).toMatch(/positive/);
    expect(positiveInteger.validate(-1)).toMatch(/positive/);
    expect(positiveInteger.validate(-100)).toMatch(/positive/);
  });
});

describe('clinicName field validator', () => {
  test('trims whitespace', () => {
    expect(clinicName.normalize('  City Clinic  ')).toBe('City Clinic');
  });

  test('accepts valid clinic names', () => {
    expect(clinicName.validate('City Clinic')).toBeNull();
    expect(clinicName.validate('A')).toBeNull();
    expect(clinicName.validate('a'.repeat(20))).toBeNull();
  });

  test('rejects invalid types', () => {
    expect(clinicName.validate(123)).toMatch(/string/);
    expect(clinicName.validate(null)).toMatch(/string/);
  });

  test('rejects too long names', () => {
    expect(clinicName.validate('a'.repeat(21))).toMatch(/at most 20/);
  });

  test('handles empty string', () => {
    expect(clinicName.validate('')).toMatch(/non-empty/);
  });
});

describe('slotDay field validator', () => {
  test('trims whitespace and uppercases', () => {
    expect(slotDay.normalize('  mon  ')).toBe('MON');
    expect(slotDay.normalize('tue')).toBe('TUE');
    expect(slotDay.normalize('WED')).toBe('WED');
  });

  test('accepts valid days', () => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    for (const day of days) {
      expect(slotDay.validate(day)).toBeNull();
    }
  });

  test('rejects invalid day strings', () => {
    expect(slotDay.validate('HOLIDAY')).toMatch(/Must be one of/);
    expect(slotDay.validate('MONDAY')).toMatch(/Must be one of/);
    expect(slotDay.validate('mon')).toMatch(/Must be one of/);
  });

  test('rejects invalid types', () => {
    expect(slotDay.validate(123)).toMatch(/string/);
    expect(slotDay.validate(null)).toMatch(/string/);
  });

  test('handles empty string', () => {
    expect(slotDay.validate('')).toMatch(/non-empty/);
  });

  test('passes non-string through normalize unchanged', () => {
    expect(slotDay.normalize(123)).toBe(123);
    expect(slotDay.normalize(null)).toBe(null);
  });
});

describe('slotTime field validator', () => {
  test('coerces string numbers to integers', () => {
    expect(slotTime.normalize('12')).toBe(12);
    expect(slotTime.normalize('0')).toBe(0);
    expect(slotTime.normalize('47')).toBe(47);
  });

  test('keeps integers as-is', () => {
    expect(slotTime.normalize(12)).toBe(12);
    expect(slotTime.normalize(0)).toBe(0);
  });

  test('handles invalid string numbers', () => {
    expect(slotTime.normalize('abc')).toBe('abc');
  });

  test('accepts valid range 0-47', () => {
    expect(slotTime.validate(0)).toBeNull();
    expect(slotTime.validate(23)).toBeNull();
    expect(slotTime.validate(47)).toBeNull();
  });

  test('rejects out of range', () => {
    expect(slotTime.validate(-1)).toMatch(/between 0 and 47/);
    expect(slotTime.validate(48)).toMatch(/between 0 and 47/);
    expect(slotTime.validate(100)).toMatch(/between 0 and 47/);
  });

  test('rejects non-numbers', () => {
    expect(slotTime.validate('12')).toMatch(/number/);
    expect(slotTime.validate(null)).toMatch(/number/);
  });

  test('rejects floats', () => {
    expect(slotTime.validate(12.5)).toMatch(/integer/);
  });
});

describe('slotFee field validator', () => {
  test('coerces string numbers to integers', () => {
    expect(slotFee.normalize('500')).toBe(500);
    expect(slotFee.normalize('1')).toBe(1);
  });

  test('keeps integers as-is', () => {
    expect(slotFee.normalize(500)).toBe(500);
  });

  test('handles invalid string numbers', () => {
    expect(slotFee.normalize('abc')).toBe('abc');
    expect(slotFee.normalize('12.5')).toBe(12);
  });

  test('accepts valid positive integers', () => {
    expect(slotFee.validate(1)).toBeNull();
    expect(slotFee.validate(500)).toBeNull();
    expect(slotFee.validate(10000)).toBeNull();
  });

  test('rejects zero and negative numbers', () => {
    expect(slotFee.validate(0)).toMatch(/positive/);
    expect(slotFee.validate(-1)).toMatch(/positive/);
  });

  test('rejects non-numbers', () => {
    expect(slotFee.validate('500')).toMatch(/number/);
    expect(slotFee.validate(null)).toMatch(/number/);
  });

  test('rejects floats', () => {
    expect(slotFee.validate(12.5)).toMatch(/integer/);
  });
});
