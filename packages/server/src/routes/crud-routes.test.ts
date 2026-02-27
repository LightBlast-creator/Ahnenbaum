/**
 * CRUD route integration tests for places, sources, and citations.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers';
import { createPlaceRoutes } from './places';
import { createSourceRoutes } from './sources';
import { createCitationRoutes } from './citations';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// ── Place routes ────────────────────────────────────────────────────

describe('place routes', () => {
  let app: ReturnType<typeof createPlaceRoutes>;
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
    app = createPlaceRoutes(db);
  });

  it('POST / creates a place', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Berlin', country: 'Germany' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe('Berlin');
  });

  it('GET / returns places list', async () => {
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Munich' }),
    });

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Response shape: { places: [...], total: n }
    expect(body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /:id returns place', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hamburg' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`);
    expect(res.status).toBe(200);
  });

  it('GET /:id returns 404 for missing place', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PATCH /:id updates place', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Old Name' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('New Name');
  });

  it('DELETE /:id removes place', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Gone City' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});

// ── Source routes ───────────────────────────────────────────────────

describe('source routes', () => {
  let app: ReturnType<typeof createSourceRoutes>;
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
    app = createSourceRoutes(db);
  });

  it('POST / creates a source', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Birth Register 1900', type: 'civil_record' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.title).toBe('Birth Register 1900');
  });

  it('GET / returns sources list', async () => {
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Church Record' }),
    });

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /:id returns source', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Census 1910' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`);
    expect(res.status).toBe(200);
  });

  it('DELETE /:id removes source', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Old Record' }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    const getRes = await app.request(`/${created.id}`);
    expect(getRes.status).toBe(404);
  });
});

// ── Citation routes ────────────────────────────────────────────────

describe('citation routes', () => {
  let app: ReturnType<typeof createCitationRoutes>;
  let db: BetterSQLite3Database;
  let sourceId: string;

  beforeEach(async () => {
    db = createTestDb();
    app = createCitationRoutes(db);

    // Citations need a source — create one directly
    const srcApp = createSourceRoutes(db);
    const srcRes = await srcApp.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Source' }),
    });
    const { data: src } = await srcRes.json();
    sourceId = src.id;
  });

  it('POST / creates a citation', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId,
        page: 'p. 42',
        text: 'Born in Berlin',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('GET /:id returns created citation', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe(created.id);
  });
});
