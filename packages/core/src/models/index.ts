/**
 * Model barrel file — re-exports all domain entity types.
 *
 * Import from '@ahnenbaum/core' (the package barrel), not from this file directly.
 */

export type {
  GenealogyDate,
  DateType,
  ExactDate,
  ApproximateDate,
  RangeDate,
  BeforeDate,
  AfterDate,
} from './date.ts';
export type { Person, PersonName, PersonNameType, Sex, PrivacyLevel } from './person.ts';
export type {
  Relationship,
  RelationshipType,
  ParentChildRelationshipType,
  PartnerRelationshipType,
  RelationshipRow,
} from './relationship.ts';
export { PARENT_CHILD_TYPES } from './relationship.ts';
export type { Event, EventType } from './event.ts';
export type { Place } from './place.ts';
export type { Source, Citation, CitationConfidence } from './source.ts';
export type { Media, MediaType, MediaLink, MediaLinkEntityType, MediaMetadata } from './media.ts';
export type { SearchEntityType } from './search.ts';
