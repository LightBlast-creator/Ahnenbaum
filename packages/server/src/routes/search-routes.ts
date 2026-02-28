/**
 * Search API routes.
 *
 * Endpoints:
 *   GET /api/search?q=...&type=...&page=...&limit=... — Search across all entities
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as searchService from '../services/search-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { SearchEntityType } from '../services/search-service';

/**
 * Create search routes.
 */
export function createSearchRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  // Ensure FTS5 index exists and populate it
  searchService.ensureSearchIndex(db);
  searchService.rebuildIndex(db);

  // GET /api/search?q=...
  router.get('/', (c) => {
    const query = c.req.query('q') ?? '';
    const type = c.req.query('type') as SearchEntityType | undefined;
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;

    const result = searchService.search(db, { query, type, page, limit });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // POST /api/search/reindex — rebuild the full search index
  router.post('/reindex', (c) => {
    searchService.rebuildIndex(db);
    return apiSuccess(c, { message: 'Search index rebuilt' });
  });

  return router;
}
