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
} from './date';
export type { Person, PersonName, PersonNameType, Sex, PrivacyLevel } from './person';
export type {
  Relationship,
  RelationshipType,
  ParentChildRelationshipType,
  PartnerRelationshipType,
} from './relationship';
export type { Event, EventType } from './event';
export type { Place } from './place';
export type { Source, Citation, CitationConfidence } from './source';
export type { Media, MediaType, MediaLink, MediaLinkEntityType, MediaMetadata } from './media';
