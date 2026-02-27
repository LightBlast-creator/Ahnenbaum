/**
 * API response helpers.
 *
 * Consistent JSON response format for all API endpoints:
 *   Success: { ok: true, data: T }
 *   Error:   { ok: false, error: AppError }
 *
 * Usage in route handlers:
 * ```ts
 * const result = personService.getById(db, id);
 * if (!result.ok) return apiError(c, result.error);
 * return apiSuccess(c, result.data);
 * ```
 */

import type { Context } from 'hono';
import type { AppError, ErrorCode } from '@ahnenbaum/core';

/** Map ErrorCode → HTTP status code. */
const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
};

/**
 * Send a successful JSON response.
 *
 * @param c     Hono context
 * @param data  Response payload
 * @param status HTTP status code (default 200)
 */
export function apiSuccess<T>(c: Context, data: T, status: number = 200): Response {
  // 204 No Content must not include a body — Node's Response constructor rejects it
  if (status === 204) {
    return c.body(null, 204);
  }
  return c.json({ ok: true, data }, status as Parameters<typeof c.json>[1]);
}

/**
 * Send an error JSON response.
 *
 * Maps the AppError code to the appropriate HTTP status.
 */
export function apiError(c: Context, error: AppError): Response {
  const status = HTTP_STATUS_MAP[error.code] ?? 500;
  return c.json({ ok: false, error }, status as Parameters<typeof c.json>[1]);
}
