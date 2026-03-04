/**
 * Centralized API client — typed wrapper around fetch().
 *
 * All methods unwrap the `{ ok, data, error }` envelope from the Hono server.
 * Throws `ApiError` on failure for consistent toast handling.
 *
 * Types and transforms are defined in `api-types.ts` and re-exported here
 * so components can import everything from `$lib/api`.
 */

// ── Re-export all types and transforms from api-types ───────────────
export {
  toPersonWithDetails,
  type Person,
  type PersonName,
  type Event,
  type Place,
  type Relationship,
  type RelationshipRow,
  type GenealogyDate,
  type Sex,
  type PersonWithDetails,
  type TreeNode,
  type PaginatedResult,
  type GetPersonsOptions,
  type CreatePersonInput,
  type CreateEventInput,
  type SearchableItem,
  type ServerPersonResponse,
  type ServerPersonNameResponse,
  type ServerEventResponse,
  type PersonMediaLink,
  type PersonMediaItem,
  type RelationshipEntry,
  type ServerTreeNode,
} from './api-types';

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

export const API_BASE = '/api';

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

// ── XHR upload with progress ────────────────────────────────────────

export interface UploadProgressEvent {
  loaded: number;
  total: number;
}

/**
 * Upload FormData via XMLHttpRequest for progress tracking.
 * Returns a promise + abort handle so callers can cancel on unmount.
 */
function uploadWithProgress<T>(
  path: string,
  formData: FormData,
  onProgress?: (event: UploadProgressEvent) => void,
): { promise: Promise<T>; abort: () => void } {
  const url = `${API_BASE}/${path}`;
  const xhr = new XMLHttpRequest();

  const promise = new Promise<T>((resolve, reject) => {
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({ loaded: e.loaded, total: e.total });
        }
      });
    }

    xhr.addEventListener('load', async () => {
      try {
        const { markOnline } = await import('./connection');
        markOnline();
      } catch {
        // ignore
      }

      if (xhr.status === 204) {
        resolve(undefined as T);
        return;
      }

      try {
        const json: ApiResponse<T> = JSON.parse(xhr.responseText);
        if (!json.ok) {
          const err = (json as ApiErrorResponse).error;
          reject(new ApiError(xhr.status, err.code, err.message, err.details));
        } else {
          resolve(json.data);
        }
      } catch {
        reject(new ApiError(xhr.status, 'PARSE_ERROR', 'Failed to parse server response'));
      }
    });

    xhr.addEventListener('error', async () => {
      try {
        const { markDisconnected } = await import('./connection');
        markDisconnected();
      } catch {
        // ignore
      }
      reject(new NetworkError('Network request failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new NetworkError('Upload aborted'));
    });

    xhr.send(formData);
  });

  return { promise, abort: () => xhr.abort() };
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

  uploadFormData<T>(
    path: string,
    formData: FormData,
    onProgress?: (event: UploadProgressEvent) => void,
  ): { promise: Promise<T>; abort: () => void } {
    return uploadWithProgress<T>(path, formData, onProgress);
  },
};
