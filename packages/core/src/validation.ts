/**
 * Shared validation constants and pure validation functions.
 *
 * These are the single source of truth for input validation rules.
 * Server services and the client can both import from here to ensure
 * consistent validation without duplication.
 */

import type { Sex, PrivacyLevel, PersonNameType } from './models/index.ts';

// ── Constants ────────────────────────────────────────────────────────

/** Maximum length for a person's given or surname. */
export const MAX_NAME_LENGTH = 200;

/** Maximum length for notes fields. */
export const MAX_NOTES_LENGTH = 10_000;

/** Maximum length for a place name. */
export const MAX_PLACE_NAME_LENGTH = 500;

/** Maximum length for a source title. */
export const MAX_SOURCE_TITLE_LENGTH = 500;

/** Allowed values for the `sex` field. */
export const ALLOWED_SEX_VALUES: readonly Sex[] = [
  'male',
  'female',
  'intersex',
  'unknown',
] as const;

/** Allowed values for the `privacy` field. */
export const ALLOWED_PRIVACY_VALUES: readonly PrivacyLevel[] = [
  'public',
  'users_only',
  'owner_only',
] as const;

/** Allowed name types. */
export const ALLOWED_NAME_TYPES: readonly PersonNameType[] = ['birth', 'married', 'alias'] as const;

// ── Validation helpers ───────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a sex value. Returns undefined if valid, or a ValidationError.
 */
export function validateSex(sex: string): ValidationError | undefined {
  if (!ALLOWED_SEX_VALUES.includes(sex as Sex)) {
    return {
      field: 'sex',
      message: `Invalid sex value '${sex}'. Allowed: ${ALLOWED_SEX_VALUES.join(', ')}`,
    };
  }
  return undefined;
}

/**
 * Validate a privacy value. Returns undefined if valid, or a ValidationError.
 */
export function validatePrivacy(privacy: string): ValidationError | undefined {
  if (!ALLOWED_PRIVACY_VALUES.includes(privacy as PrivacyLevel)) {
    return {
      field: 'privacy',
      message: `Invalid privacy value '${privacy}'. Allowed: ${ALLOWED_PRIVACY_VALUES.join(', ')}`,
    };
  }
  return undefined;
}

/**
 * Validate a name type. Returns undefined if valid, or a ValidationError.
 */
export function validateNameType(type: string): ValidationError | undefined {
  if (!ALLOWED_NAME_TYPES.includes(type as PersonNameType)) {
    return {
      field: 'type',
      message: `Invalid name type '${type}'. Allowed: ${ALLOWED_NAME_TYPES.join(', ')}`,
    };
  }
  return undefined;
}

/**
 * Validate a string length against a maximum. Returns undefined if valid.
 */
export function validateMaxLength(
  field: string,
  value: string,
  max: number,
): ValidationError | undefined {
  if (value.length > max) {
    return { field, message: `${field} exceeds maximum length of ${max} characters` };
  }
  return undefined;
}

/**
 * Validate that a required string is non-empty after trimming.
 */
export function validateRequired(field: string, value: string): ValidationError | undefined {
  if (!value || value.trim().length === 0) {
    return { field, message: `${field} is required` };
  }
  return undefined;
}

/**
 * Validate that two IDs are not the same (prevents self-relationships).
 */
export function validateNotSelfReferencing(idA: string, idB: string): ValidationError | undefined {
  if (idA === idB) {
    return {
      field: 'personBId',
      message: 'Cannot create a relationship between a person and themselves',
    };
  }
  return undefined;
}
