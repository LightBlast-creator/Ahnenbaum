/**
 * Relationship types — typed edge graph model.
 *
 * Each relationship is a first-class entity: (PersonA) —[type, metadata]→ (PersonB).
 * This replaces GEDCOM's rigid "Family" container with a flexible graph.
 *
 * No gendered assumptions — same-sex relationships are first-class.
 */

import type { GenealogyDate } from './date';

/** Parent-child relationship types. */
export type ParentChildRelationshipType =
  | 'biological_parent'
  | 'adoptive_parent'
  | 'step_parent'
  | 'foster_parent'
  | 'guardian'
  | 'godparent';

/** Runtime list of all parent-child relationship types. */
export const PARENT_CHILD_TYPES: readonly ParentChildRelationshipType[] = [
  'biological_parent',
  'adoptive_parent',
  'step_parent',
  'foster_parent',
  'guardian',
  'godparent',
] as const;

/** Partner/spouse relationship types. */
export type PartnerRelationshipType =
  | 'marriage'
  | 'civil_partnership'
  | 'domestic_partnership'
  | 'cohabitation'
  | 'engagement'
  | 'custom';

/** All relationship types. */
export type RelationshipType = ParentChildRelationshipType | PartnerRelationshipType;

/**
 * Relationship — a typed edge between two persons.
 *
 * `personAId` and `personBId` reference Person records.
 * For parent-child types, personA is the parent and personB is the child.
 */
export interface Relationship {
  readonly id: string;
  readonly personAId: string;
  readonly personBId: string;
  readonly type: RelationshipType;
  readonly startDate?: GenealogyDate;
  readonly endDate?: GenealogyDate;
  readonly placeId?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}
