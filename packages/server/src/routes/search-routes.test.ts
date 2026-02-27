/**
 * Search routes integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers';
import { createSearchRoutes } from './search-routes';
import { createPersonRoutes } from './persons';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

describe('search routes', () => {
  let app: ReturnType<typeof createSearchRoutes>;
  let db: BetterSQLite3Database;

  beforeEach(async () => {
    db = createTestDb();
    app = createSearchRoutes(db);

    const personApp = createPersonRoutes(db);
    await personApp.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Wolfgang', surname: 'Amadeus' }],
      }),
    });
  });

  it('GET /?q= returns structured search results', async () => {
    const res = await app.request('/?q=Wolfgang');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Response: { results: [...], total, facets }
    expect(body.data.results).toBeDefined();
    expect(body.data.facets).toBeDefined();
  });

  it('GET /?q= with empty query returns empty results', async () => {
    const res = await app.request('/?q=');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.results).toHaveLength(0);
    expect(body.data.total).toBe(0);
  });

  it('POST /reindex rebuilds search index', async () => {
    const res = await app.request('/reindex', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
