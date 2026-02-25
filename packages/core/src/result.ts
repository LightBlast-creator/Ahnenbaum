/**
 * Result type — explicit error handling without exceptions.
 *
 * Services return Result<T> instead of throwing. This makes error paths
 * visible in the type signature and is more reliable for LLM-generated code.
 *
 * Usage:
 * ```ts
 * const result = await getPersonById(db, id);
 * if (!result.ok) {
 *   // result.error is AppError
 *   return apiError(c, result.error);
 * }
 * // result.data is Person
 * return apiSuccess(c, result.data);
 * ```
 */

/**
 * All known error codes.
 * Mapped to HTTP status codes in the server's api-response helper.
 */
export type ErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

/**
 * Structured application error.
 *
 * `details` carries field-level validation errors or extra context.
 */
export interface AppError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Result type — success or failure.
 *
 * Discriminate on `ok`:
 * ```ts
 * if (result.ok) { result.data }
 * else           { result.error }
 * ```
 */
export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

// ── Helper constructors ──────────────────────────────────────────────

/** Create a successful Result. */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/** Create a failed Result. */
export function err<T>(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Result<T> {
  return { ok: false, error: { code, message, details } };
}
