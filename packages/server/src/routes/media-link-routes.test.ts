/**
 * Media link routes integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers';
import { createMediaLinkRoutes } from './media-link-routes';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

describe('media-link routes', () => {
  let app: ReturnType<typeof createMediaLinkRoutes>;
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
    app = createMediaLinkRoutes(db);
  });

  it('GET /entity/:type/:id returns empty list when no links exist', async () => {
    const res = await app.request('/entity/person/any-id');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('POST / rejects invalid entityType with 400', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'invalid',
        entityId: 'some-id',
        mediaId: 'media-id',
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('POST / accepts valid entityType', async () => {
    // This will fail at the DB level (no media with that id), but the entityType validation will pass
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'person',
        entityId: 'some-person-id',
        mediaId: 'some-media-id',
      }),
    });
    // Will either succeed (201) or fail due to FK constraint — but NOT 400 validation error
    expect(res.status).not.toBe(400);
  });
});
