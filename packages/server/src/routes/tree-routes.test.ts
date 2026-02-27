/**
 * Tree routes integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers';
import { createTreeRoutes } from './tree-routes';
import { createPersonRoutes } from './persons';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

describe('tree routes', () => {
  let app: ReturnType<typeof createTreeRoutes>;
  let db: BetterSQLite3Database;
  let personId: string;

  beforeEach(async () => {
    db = createTestDb();
    app = createTreeRoutes(db);

    const personApp = createPersonRoutes(db);
    const res = await personApp.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Root', surname: 'Person' }],
      }),
    });
    personId = (await res.json()).data.id;
  });

  // Routes: GET /full, GET /:id
  it('GET /:id returns ancestor tree', async () => {
    const res = await app.request(`/${personId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.person).toBeDefined();
  });

  it('GET /:id with nonexistent person returns null tree', async () => {
    const res = await app.request('/ghost-id');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // buildAncestorTree returns ok(null) for missing persons
    expect(body.data).toBeNull();
  });

  it('GET /full returns full family graph', async () => {
    const res = await app.request('/full');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.persons).toBeDefined();
    expect(body.data.relationships).toBeDefined();
  });
});
