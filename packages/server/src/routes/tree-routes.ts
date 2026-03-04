/**
 * Tree API routes.
 *
 * Endpoints:
 *   GET /api/tree/full       — Full family graph (all persons + all relationships)
 *   GET /api/tree/:id        — Ancestor pedigree for a single person
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response.ts';
import * as treeService from '../services/tree-service.ts';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * Create tree routes.
 * NOTE: /full must be registered before /:id so Hono doesn't match "full" as an id param.
 */
export function createTreeRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  // GET /api/tree/full — full family graph for the global overview
  router.get('/full', (c) => {
    const result = treeService.getFullFamilyTree(db);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/tree/stats — aggregated dashboard statistics
  router.get('/stats', (c) => {
    const result = treeService.getTreeStats(db);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/tree/:id — ancestor pedigree for a single person
  router.get('/:id', (c) => {
    const id = c.req.param('id');
    const generations = Number(c.req.query('generations')) || 4;
    const result = treeService.buildAncestorTree(db, id, generations);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  return router;
}
