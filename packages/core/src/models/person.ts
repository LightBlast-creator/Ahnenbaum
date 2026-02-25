/**
 * Person and related types.
 *
 * A person is the central entity in the family tree. Each person can have
 * multiple names (birth name, married name, aliases) and is linked to
 * events, relationships, and media via foreign keys.
 */

/** Biological sex. No gendered assumptions — used for GEDCOM compatibility. */
export type Sex = 'male' | 'female' | 'intersex' | 'unknown';

/** Type of a person name entry. */
export type PersonNameType = 'birth' | 'married' | 'alias';

/**
 * A single name record for a person.
 *
 * A person can have multiple names (maiden → married, aliases, etc.).
 * Exactly one should be marked `isPreferred: true`.
 */
export interface PersonName {
  readonly id: string;
  readonly personId: string;
  readonly given: string;
  readonly surname: string;
  readonly maiden?: string;
  readonly nickname?: string;
  readonly type: PersonNameType;
  readonly isPreferred: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Privacy level for a person record. */
export type PrivacyLevel = 'public' | 'users_only' | 'owner_only';

/**
 * Person — the central domain entity.
 *
 * Names and events are loaded separately via joins. This interface
 * represents the core person record, optionally populated with related data.
 */
export interface Person {
  readonly id: string;
  readonly sex: Sex;
  readonly notes?: string;
  readonly privacy: PrivacyLevel;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}
