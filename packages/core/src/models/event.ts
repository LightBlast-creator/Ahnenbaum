/**
 * Event / Fact types.
 *
 * Events are the extensible fact system — births, deaths, marriages,
 * occupations, custom events, etc. Each event is linked to a person
 * or relationship, optionally with a place and citation.
 */

import type { GenealogyDate } from './date';

/** Built-in event types. "custom" allows user-defined events. */
export type EventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'baptism'
  | 'burial'
  | 'immigration'
  | 'emigration'
  | 'occupation'
  | 'residence'
  | 'military_service'
  | 'education'
  | 'census'
  | 'custom';

/**
 * Event — a fact or life event.
 *
 * Linked to either a person OR a relationship (not both).
 * - Person events: birth, death, occupation, etc.
 * - Relationship events: marriage ceremony, divorce, etc.
 */
export interface Event {
  readonly id: string;
  readonly type: EventType;
  readonly date?: GenealogyDate;
  readonly placeId?: string;
  readonly personId?: string;
  readonly relationshipId?: string;
  readonly description?: string;
  readonly notes?: string;
  readonly citationId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}
