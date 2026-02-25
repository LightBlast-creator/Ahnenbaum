/**
 * Citation API routes.
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as sourceService from '../services/source-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export function createCitationRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    const body = await c.req.json();
    const result = sourceService.createCitation(db, body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  router.get('/:id', (c) => {
    const result = sourceService.getCitationById(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.patch('/:id', async (c) => {
    const body = await c.req.json();
    const result = sourceService.updateCitation(db, c.req.param('id'), body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.delete('/:id', (c) => {
    const result = sourceService.deleteCitation(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  return router;
}
