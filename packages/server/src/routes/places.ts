/**
 * Place API routes.
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as placeService from '../services/place-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export function createPlaceRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    const body = await c.req.json();
    const result = placeService.createPlace(db, body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  router.get('/', (c) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const search = c.req.query('search') || undefined;
    const result = placeService.listPlaces(db, { page, limit, search });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.get('/:id', (c) => {
    const result = placeService.getPlaceById(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.patch('/:id', async (c) => {
    const body = await c.req.json();
    const result = placeService.updatePlace(db, c.req.param('id'), body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.delete('/:id', (c) => {
    const result = placeService.deletePlace(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  return router;
}
