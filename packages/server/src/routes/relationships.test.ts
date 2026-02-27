/**
 * Relationship routes integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers';
import { createRelationshipRoutes } from './relationships';
import { createPersonRoutes } from './persons';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

describe('relationship routes', () => {
  let app: ReturnType<typeof createRelationshipRoutes>;
  let db: BetterSQLite3Database;
  let personAId: string;
  let personBId: string;

  beforeEach(async () => {
    db = createTestDb();
    app = createRelationshipRoutes(db);

    const personApp = createPersonRoutes(db);
    const resA = await personApp.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: [{ given: 'Parent', surname: 'A' }] }),
    });
    personAId = (await resA.json()).data.id;

    const resB = await personApp.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: [{ given: 'Child', surname: 'B' }] }),
    });
    personBId = (await resB.json()).data.id;
  });

  it('POST / creates a relationship', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personAId,
        personBId,
        type: 'biological_parent',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.type).toBe('biological_parent');
  });

  it('GET / returns relationships list', async () => {
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personAId, personBId, type: 'marriage' }),
    });

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Response: { relationships: [...], total }
    expect(body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /:id returns relationship', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personAId, personBId, type: 'biological_parent' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(created.id);
  });

  it('DELETE /:id removes relationship', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personAId, personBId, type: 'marriage' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});
