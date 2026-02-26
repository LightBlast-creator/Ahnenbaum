/**
 * Relationship API routes.
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as relService from '../services/relationship-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { EventBus } from '../plugin-runtime/event-bus';

export function createRelationshipRoutes(db: BetterSQLite3Database, eventBus?: EventBus): Hono {
  const router = new Hono();

  router.post('/', async (c) => {
    const body = await c.req.json();
    const result = relService.createRelationship(db, body);
    if (!result.ok) return apiError(c, result.error);
    eventBus?.emit('relationship.created', {
      relationshipId: result.data.id,
      relationship: { ...result.data },
    });
    return apiSuccess(c, result.data, 201);
  });

  router.get('/', (c) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const result = relService.listRelationships(db, { page, limit });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.get('/:id', (c) => {
    const result = relService.getRelationshipById(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  /** Get all relationships for a specific person, grouped by type. */
  router.get('/person/:personId', (c) => {
    const result = relService.getRelationshipsForPerson(db, c.req.param('personId'));
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.patch('/:id', async (c) => {
    const body = await c.req.json();
    const result = relService.updateRelationship(db, c.req.param('id'), body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  router.delete('/:id', (c) => {
    const result = relService.deleteRelationship(db, c.req.param('id'));
    if (!result.ok) return apiError(c, result.error);
    eventBus?.emit('relationship.deleted', { relationshipId: c.req.param('id') });
    return apiSuccess(c, null, 204);
  });

  return router;
}
