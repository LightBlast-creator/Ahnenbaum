/**
 * Pagination helper — normalizes page/limit parameters.
 *
 * Used across all list endpoints to ensure consistent defaults and bounds.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Normalize pagination parameters with consistent defaults and bounds.
 *
 * - page: minimum 1, defaults to 1
 * - limit: clamped to [1, 100], defaults to 20
 * - offset: derived from page and limit
 */
export function normalizePagination(opts: PaginationParams = {}): NormalizedPagination {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
