/**
 * Centralized API client — typed wrapper around fetch().
 *
 * All methods unwrap the `{ ok, data, error }` envelope from the Hono server.
 * Throws `ApiError` on failure for consistent toast handling.
 *
 * Also re-exports `PersonWithDetails` and related frontend types so that
 * components can import from `$lib/api` instead of mock-data.
 */

import type {
  Person,
  PersonName,
  Event,
  Place,
  GenealogyDate,
  Sex,
  Relationship,
} from '@ahnenbaum/core';

// ── Network error ───────────────────────────────────────────────────

/** Thrown when the server is unreachable (fetch itself fails). */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

// ── API error ───────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Envelope types ──────────────────────────────────────────────────

interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

interface ApiErrorResponse {
  ok: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Retry config ────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'PATCH', 'DELETE']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Core fetch helper ───────────────────────────────────────────────

const API_BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  queryParams?: Record<string, string | number | undefined>,
): Promise<T> {
  let url = `${API_BASE}/${path}`;

  if (queryParams) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const opts: RequestInit = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };

  const canRetry = IDEMPOTENT_METHODS.has(method.toUpperCase());
  const maxAttempts = canRetry ? MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, opts);

      // Fetch succeeded — server is reachable
      // Lazy-import to avoid circular deps at module load
      const { markOnline } = await import('./connection');
      markOnline();

      // 204 No Content — no body to parse
      if (res.status === 204) {
        return undefined as T;
      }

      const json: ApiResponse<T> = await res.json();

      if (!json.ok) {
        const err = (json as ApiErrorResponse).error;
        throw new ApiError(res.status, err.code, err.message, err.details);
      }

      return json.data;
    } catch (err) {
      // If it's an ApiError, don't retry (server responded, just with an error)
      if (err instanceof ApiError) throw err;

      // Network-level failure — server unreachable
      const isLastAttempt = attempt === maxAttempts - 1;

      if (!isLastAttempt) {
        // Exponential backoff: 1s, 2s, 4s
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }

      // All retries exhausted — notify connection module and throw
      const { markDisconnected } = await import('./connection');
      markDisconnected();

      throw new NetworkError(err instanceof Error ? err.message : 'Network request failed');
    }
  }

  // TypeScript: unreachable, but satisfies return type
  throw new NetworkError('Network request failed');
}

/**
 * Like request(), but sends FormData (for file uploads).
 * Does NOT set Content-Type — the browser auto-sets the multipart boundary.
 */
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}/${path}`;

  // File uploads are not idempotent — no retries
  try {
    const res = await fetch(url, { method: 'POST', body: formData });

    const { markOnline } = await import('./connection');
    markOnline();

    if (res.status === 204) return undefined as T;

    const json: ApiResponse<T> = await res.json();
    if (!json.ok) {
      const err = (json as ApiErrorResponse).error;
      throw new ApiError(res.status, err.code, err.message, err.details);
    }
    return json.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const { markDisconnected } = await import('./connection');
    markDisconnected();
    throw new NetworkError(err instanceof Error ? err.message : 'Network request failed');
  }
}

// ── Public API ──────────────────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return request<T>('GET', path, undefined, params);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  del(path: string): Promise<undefined> {
    return request<undefined>('DELETE', path);
  },

  postFormData<T>(path: string, formData: FormData): Promise<T> {
    return requestFormData<T>(path, formData);
  },
};

// ── Frontend types ─────────────────────────────────────────────────
// Re-exported so components import from `$lib/api` instead of mock-data.

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

// ── Transform helpers ───────────────────────────────────────────────
// Transform server response shapes into frontend PersonWithDetails.

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

interface ServerPersonNameResponse {
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

// ── Re-export core types for convenience ────────────────────────────
export type { Person, PersonName, Event, Place, Relationship, GenealogyDate, Sex };

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

/** Relationship row as returned by the server API. */
export interface RelationshipRow {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  placeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

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
