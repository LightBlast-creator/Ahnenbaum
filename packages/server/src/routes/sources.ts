/**
 * Source API routes.
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as sourceService from '../services/source-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export function createSourceRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    const body = await c.req.json();
    const result = sourceService.createSource(db, body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  router.get('/', (c) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const search = c.req.query('search') || undefined;
    const result = sourceService.listSources(db, { page, limit, search });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.get('/:id', (c) => {
    const result = sourceService.getSourceById(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.patch('/:id', async (c) => {
    const body = await c.req.json();
    const result = sourceService.updateSource(db, c.req.param('id'), body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.delete('/:id', (c) => {
    const result = sourceService.deleteSource(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  return router;
}
