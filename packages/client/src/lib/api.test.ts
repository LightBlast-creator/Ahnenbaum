/**
 * API client unit tests.
 *
 * Covers: NetworkError, ApiError, request() retry logic, envelope unwrapping,
 * query params, requestFormData(), and 204 handling.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { api, NetworkError, ApiError } from './api';

// ── Mock connection module (dynamic import) ────────────────────────

vi.mock('./connection', () => ({
  markOnline: vi.fn(),
  markDisconnected: vi.fn(),
}));

// ── Helpers ─────────────────────────────────────────────────────────

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('has correct name and default message', () => {
    const err = new NetworkError();
    expect(err.name).toBe('NetworkError');
    expect(err.message).toBe('Network request failed');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NetworkError);
  });

  it('accepts custom message', () => {
    const err = new NetworkError('Server down');
    expect(err.message).toBe('Server down');
  });
});

describe('ApiError', () => {
  it('has correct properties', () => {
    const err = new ApiError(422, 'VALIDATION_ERROR', 'Bad input', { field: 'name' });
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Bad input');
    expect(err.details).toEqual({ field: 'name' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('works without details', () => {
    const err = new ApiError(404, 'NOT_FOUND', 'Gone');
    expect(err.details).toBeUndefined();
  });
});

describe('api.get', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('unwraps success envelope', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ id: '1' }));
    vi.stubGlobal('fetch', mockFetch);

    const data = await api.get<{ id: string }>('persons/1');
    expect(data).toEqual({ id: '1' });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toBe('/api/persons/1');
  });

  it('throws ApiError on error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse('NOT_FOUND', 'Person not found', 404)),
    );

    await expect(api.get('persons/missing')).rejects.toThrow(ApiError);
  });

  it('throws ApiError with correct fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorResponse('NOT_FOUND', 'Person not found', 404)),
    );

    try {
      await api.get('persons/missing');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.code).toBe('NOT_FOUND');
      expect(apiErr.message).toBe('Person not found');
    }
  });

  it('serializes query params into URL', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', mockFetch);

    await api.get('persons', { page: 2, limit: 10 });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
  });

  it('omits undefined and empty query params', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal('fetch', mockFetch);

    await api.get('persons', { page: 1, search: undefined, q: '' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).not.toContain('search');
    expect(url).not.toContain('q=');
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(noContentResponse()));

    const result = await api.get('something');
    expect(result).toBeUndefined();
  });
});

describe('api.get — retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('retries GET on network failure up to 3 times', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    vi.stubGlobal('fetch', mockFetch);

    const promise = api.get('test');

    // Advance through backoff delays: 1s, 2s, 4s
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const data = await promise;
    expect(data).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('throws NetworkError after all retries exhausted', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    vi.stubGlobal('fetch', mockFetch);

    // Suppress PromiseRejectionHandledWarning: retry creates intermediate promises
    // that are briefly unhandled during fake timer advancement, then handled later.
    const noop = () => {
      /* swallow */
    };
    const warnFilter = (w: Error) => {
      if (w.name === 'PromiseRejectionHandledWarning') return;
      console.warn(w);
    };
    process.on('unhandledRejection', noop);
    process.on('rejectionHandled', noop);
    process.on('warning', warnFilter);

    const promise = api.get('test');

    // Advance through all backoff delays and let microtasks settle
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(2000);
    }

    await expect(promise).rejects.toThrow(NetworkError);
    // 1 initial + 3 retries = 4 attempts
    expect(mockFetch).toHaveBeenCalledTimes(4);

    process.off('unhandledRejection', noop);
    process.off('rejectionHandled', noop);
    process.off('warning', warnFilter);
  });

  it('does not retry ApiError (server responded)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(errorResponse('VALIDATION_ERROR', 'Bad data', 422));
    vi.stubGlobal('fetch', mockFetch);

    await expect(api.get('test')).rejects.toThrow(ApiError);
    // Should only attempt once — ApiError means server is reachable
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe('api.post — no retry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not retry POST on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    vi.stubGlobal('fetch', mockFetch);

    await expect(api.post('persons', { name: 'test' })).rejects.toThrow(NetworkError);
    // POST is not idempotent — no retries
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('sends JSON body with Content-Type header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ id: '1' }));
    vi.stubGlobal('fetch', mockFetch);

    await api.post('persons', { name: 'test' });
    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opts.body).toBe(JSON.stringify({ name: 'test' }));
  });
});

describe('api.patch — idempotent retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('retries PATCH on network failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ updated: true }));

    vi.stubGlobal('fetch', mockFetch);

    const promise = api.patch('persons/1', { name: 'new' });
    await vi.advanceTimersByTimeAsync(1000);

    const data = await promise;
    expect(data).toEqual({ updated: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('api.del', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns undefined for successful DELETE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(noContentResponse()));

    const result = await api.del('persons/1');
    expect(result).toBeUndefined();
  });
});

describe('api.postFormData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends FormData without Content-Type header', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ id: 'media-1' }));
    vi.stubGlobal('fetch', mockFetch);

    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.jpg');

    const data = await api.postFormData<{ id: string }>('media', formData);
    expect(data).toEqual({ id: 'media-1' });

    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe('POST');
    // Should NOT have Content-Type — browser sets multipart boundary
    expect(opts.headers).toBeUndefined();
    expect(opts.body).toBe(formData);
  });

  it('does not retry FormData uploads on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    vi.stubGlobal('fetch', mockFetch);

    const formData = new FormData();
    await expect(api.postFormData('media', formData)).rejects.toThrow(NetworkError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('throws ApiError on error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(errorResponse('VALIDATION_ERROR', 'No file', 400)),
    );

    const formData = new FormData();
    await expect(api.postFormData('media', formData)).rejects.toThrow(ApiError);
  });
});
