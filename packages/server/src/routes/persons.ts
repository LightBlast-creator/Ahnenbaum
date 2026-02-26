/**
 * Person API routes.
 *
 * Endpoints:
 *   POST   /api/persons                    — Create a person
 *   GET    /api/persons                    — List persons (paginated)
 *   GET    /api/persons/:id                — Get person by ID
 *   PATCH  /api/persons/:id                — Update a person
 *   DELETE /api/persons/:id                — Soft-delete a person
 *   POST   /api/persons/:id/events         — Add event to person
 *   PATCH  /api/persons/:id/events/:eventId — Update event
 *   DELETE /api/persons/:id/events/:eventId — Delete event
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as personService from '../services/person-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { EventBus } from '../plugin-runtime/event-bus';

/**
 * Create person routes.
 *
 * The DB instance is injected so tests can provide an in-memory database.
 */
export function createPersonRoutes(db: BetterSQLite3Database, eventBus?: EventBus): Hono {
  const router = new Hono();

  // POST /api/persons
  router.post('/', async (c) => {
    const body = await c.req.json();
    const result = personService.createPerson(db, body);
    if (!result.ok) return apiError(c, result.error);
    eventBus?.emit('person.created', { personId: result.data.id, person: { ...result.data } });
    return apiSuccess(c, result.data, 201);
  });

  // GET /api/persons
  router.get('/', (c) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const result = personService.listPersons(db, { page, limit });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/persons/:id
  router.get('/:id', (c) => {
    const id = c.req.param('id');
    const result = personService.getPersonById(db, id);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // PATCH /api/persons/:id
  router.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = personService.updatePerson(db, id, body);
    if (!result.ok) return apiError(c, result.error);
    eventBus?.emit('person.updated', {
      personId: id,
      person: { ...result.data },
      changes: body as Record<string, unknown>,
    });
    return apiSuccess(c, result.data);
  });

  // DELETE /api/persons/:id
  router.delete('/:id', (c) => {
    const id = c.req.param('id');
    const result = personService.deletePerson(db, id);
    if (!result.ok) return apiError(c, result.error);
    eventBus?.emit('person.deleted', { personId: id });
    return apiSuccess(c, null, 204);
  });

  // POST /api/persons/:id/events
  router.post('/:id/events', async (c) => {
    const personId = c.req.param('id');
    const body = await c.req.json();
    const result = personService.addPersonEvent(db, personId, body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  // PATCH /api/persons/:id/events/:eventId
  router.patch('/:id/events/:eventId', async (c) => {
    const personId = c.req.param('id');
    const eventId = c.req.param('eventId');
    const body = await c.req.json();
    const result = personService.updatePersonEvent(db, personId, eventId, body);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // DELETE /api/persons/:id/events/:eventId
  router.delete('/:id/events/:eventId', (c) => {
    const personId = c.req.param('id');
    const eventId = c.req.param('eventId');
    const result = personService.deletePersonEvent(db, personId, eventId);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  return router;
}
