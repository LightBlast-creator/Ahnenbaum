import { describe, it, expect } from 'vitest';
import {
  validateSex,
  validatePrivacy,
  validateNameType,
  validateMaxLength,
  validateRequired,
  validateNotSelfReferencing,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  ALLOWED_SEX_VALUES,
  ALLOWED_PRIVACY_VALUES,
  ALLOWED_NAME_TYPES,
} from './validation.ts';

describe('validateSex', () => {
  it('accepts all valid sex values', () => {
    for (const v of ALLOWED_SEX_VALUES) {
      expect(validateSex(v)).toBeUndefined();
    }
  });

  it('rejects invalid sex value', () => {
    const err = validateSex('robot');
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('sex');
    expect(err.message).toContain('robot');
  });

  it('rejects empty string', () => {
    expect(validateSex('')).toBeDefined();
  });
});

describe('validatePrivacy', () => {
  it('accepts all valid privacy values', () => {
    for (const v of ALLOWED_PRIVACY_VALUES) {
      expect(validatePrivacy(v)).toBeUndefined();
    }
  });

  it('rejects invalid privacy value', () => {
    const err = validatePrivacy('secret');
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('privacy');
  });
});

describe('validateNameType', () => {
  it('accepts all valid name types', () => {
    for (const v of ALLOWED_NAME_TYPES) {
      expect(validateNameType(v)).toBeUndefined();
    }
  });

  it('rejects invalid name type', () => {
    const err = validateNameType('nickname');
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('type');
  });
});

describe('validateMaxLength', () => {
  it('accepts string within limit', () => {
    expect(validateMaxLength('name', 'Alice', MAX_NAME_LENGTH)).toBeUndefined();
  });

  it('accepts string exactly at limit', () => {
    const exact = 'a'.repeat(MAX_NAME_LENGTH);
    expect(validateMaxLength('name', exact, MAX_NAME_LENGTH)).toBeUndefined();
  });

  it('rejects string exceeding limit', () => {
    const long = 'a'.repeat(MAX_NAME_LENGTH + 1);
    const err = validateMaxLength('name', long, MAX_NAME_LENGTH);
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('name');
  });

  it('accepts empty string (not a length violation)', () => {
    expect(validateMaxLength('notes', '', MAX_NOTES_LENGTH)).toBeUndefined();
  });
});

describe('validateRequired', () => {
  it('accepts non-empty string', () => {
    expect(validateRequired('name', 'Alice')).toBeUndefined();
  });

  it('rejects empty string', () => {
    const err = validateRequired('name', '');
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('name');
  });

  it('rejects whitespace-only string', () => {
    const err = validateRequired('name', '   ');
    expect(err).toBeDefined();
  });
});

describe('validateNotSelfReferencing', () => {
  it('accepts different IDs', () => {
    expect(validateNotSelfReferencing('a', 'b')).toBeUndefined();
  });

  it('rejects same IDs', () => {
    const err = validateNotSelfReferencing('x', 'x');
    expect(err).toBeDefined();
    if (!err) return;
    expect(err.field).toBe('personBId');
  });
});
