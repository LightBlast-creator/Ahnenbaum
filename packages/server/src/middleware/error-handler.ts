/**
 * Global error handler middleware for Hono.
 *
 * Catches any unhandled exceptions and returns a consistent
 * JSON error response. This is the last safety net — services
 * should return Result types, not throw.
 */

import type { ErrorHandler } from 'hono';

/**
 * Hono onError handler.
 *
 * Logs the error for debugging and returns a 500 with the
 * standard error response shape.
 */
export const errorHandler: ErrorHandler = (error, c) => {
  console.error('[unhandled error]', error);

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error
        ? error.message
        : String(error);

  return c.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR' as const,
        message,
      },
    },
    500,
  );
};
