/**
 * Frontend types and transform helpers for the API layer.
 *
 * Extracted from api.ts to separate type definitions and data transforms
 * from the HTTP client implementation.
 *
 * Components should import from `$lib/api` which re-exports everything here.
 */

import type {
  Person,
  PersonName,
  Event,
  Place,
  GenealogyDate,
  Sex,
  Relationship,
  RelationshipRow,
} from '@ahnenbaum/core';

// ── Re-export core types for convenience ────────────────────────────
export type { Person, PersonName, Event, Place, Relationship, RelationshipRow, GenealogyDate, Sex };

// ── Frontend types ──────────────────────────────────────────────────

/** Enriched person with preferred name and key dates resolved. */
export interface PersonWithDetails extends Person {
  preferredName: PersonName;
  allNames: PersonName[];
  birthEvent?: Event;
  deathEvent?: Event;
  birthPlace?: Place;
  /** Thumbnail URL for primary photo, if set. */
  primaryPhotoUrl?: string;
}

/** TreeNode for ancestor pedigree rendering. */
export interface TreeNode {
  person: PersonWithDetails;
  parents: TreeNode[];
}

/** Paginated list response. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Options for listing persons. */
export interface GetPersonsOptions {
  search?: string;
  sortBy?: 'name' | 'birth' | 'death';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Input for creating a new person via API. */
export interface CreatePersonInput {
  sex?: Sex;
  notes?: string;
  names: { given: string; surname: string; isPreferred?: boolean }[];
  /** Convenience: auto-creates a birth event if provided. */
  birthDate?: GenealogyDate;
  /** Convenience: auto-creates a death event if provided. */
  deathDate?: GenealogyDate;
}

/** Input for creating an event via API. */
export interface CreateEventInput {
  type: string;
  date?: GenealogyDate;
  placeId?: string;
  description?: string;
  notes?: string;
}

/** Searchable item shape used by CommandPalette. */
export interface SearchableItem {
  id: string;
  type: 'person' | 'place' | 'event' | 'source' | 'media';
  label: string;
  sublabel?: string;
  href: string;
}

// ── Server response shapes ──────────────────────────────────────────

export interface ServerPersonResponse {
  id: string;
  sex: Sex;
  notes: string | null;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  names: ServerPersonNameResponse[];
  events: ServerEventResponse[];
  primaryMediaId?: string;
}

export interface ServerPersonNameResponse {
  id: string;
  personId: string;
  given: string;
  surname: string;
  maiden: string | null;
  nickname: string | null;
  type: string;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServerEventResponse {
  id: string;
  type: string;
  date: string | null;
  placeId: string | null;
  personId: string | null;
  relationshipId: string | null;
  description: string | null;
  notes: string | null;
  citationId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ── Transform helpers ───────────────────────────────────────────────

/**
 * Transform a server person response (with names + events) into PersonWithDetails.
 */
export function toPersonWithDetails(
  raw: ServerPersonResponse,
  places?: Place[],
): PersonWithDetails {
  const allNames: PersonName[] = raw.names.map((n) => ({
    id: n.id,
    personId: n.personId,
    given: n.given,
    surname: n.surname,
    maiden: n.maiden ?? undefined,
    nickname: n.nickname ?? undefined,
    type: n.type as PersonName['type'],
    isPreferred: n.isPreferred,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  const preferredName = allNames.find((n) => n.isPreferred) ?? allNames[0];

  const personEvents: Event[] = raw.events
    .filter((e) => !e.deletedAt)
    .map((e) => ({
      id: e.id,
      type: e.type as Event['type'],
      date: e.date ? (JSON.parse(e.date) as GenealogyDate) : undefined,
      placeId: e.placeId ?? undefined,
      personId: e.personId ?? undefined,
      relationshipId: e.relationshipId ?? undefined,
      description: e.description ?? undefined,
      notes: e.notes ?? undefined,
      citationId: e.citationId ?? undefined,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt ?? undefined,
    }));

  const birthEvent = personEvents.find((e) => e.type === 'birth');
  const deathEvent = personEvents.find((e) => e.type === 'death');
  const birthPlace =
    birthEvent?.placeId && places ? places.find((p) => p.id === birthEvent.placeId) : undefined;

  return {
    id: raw.id,
    sex: raw.sex,
    notes: raw.notes ?? undefined,
    privacy: raw.privacy as Person['privacy'],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt ?? undefined,
    preferredName,
    allNames,
    birthEvent,
    deathEvent,
    birthPlace,
    primaryPhotoUrl: raw.primaryMediaId ? `/api/media/${raw.primaryMediaId}/thumb` : undefined,
  };
}

// ── Media types ─────────────────────────────────────────────────────

/** Media-link metadata as returned by the API. */
export interface PersonMediaLink {
  id: string;
  isPrimary: boolean | null;
  caption: string | null;
  sortOrder: number | null;
}

/** Media-item metadata as returned by the API. */
export interface PersonMediaItem {
  id: string;
  type: string;
  originalFilename: string;
  mimeType: string;
  caption: string | null;
  description: string | null;
  date: string | null;
  size: number;
}

// ── Relationship types ──────────────────────────────────────────────

/** Enriched relationship entry for UI rendering. */
export interface RelationshipEntry {
  relationship: RelationshipRow;
  relatedPerson: PersonWithDetails;
  role: 'parent' | 'child' | 'partner';
}

// ── Tree types ──────────────────────────────────────────────────────

/** Tree node as returned by the server API (recursive). */
export interface ServerTreeNode {
  person: ServerPersonResponse;
  parents: ServerTreeNode[];
}
