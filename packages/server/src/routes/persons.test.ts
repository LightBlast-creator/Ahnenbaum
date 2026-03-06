/**
 * Person routes integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { createTestDb } from '../test-helpers.ts';
import { createPersonRoutes } from './persons.ts';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

describe('person routes', () => {
  let app: ReturnType<typeof createPersonRoutes>;
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
    app = createPersonRoutes(db);
  });

  it('POST / creates a person and returns 201', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Max', surname: 'Müller' }],
        sex: 'male',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.names[0].given).toBe('Max');
  });

  it('GET / returns list with total', async () => {
    await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Anna', surname: 'Schmidt' }],
      }),
    });

    const res = await app.request('/?page=1&limit=10');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.persons).toHaveLength(1);
    expect(body.data.total).toBe(1);
  });

  it('GET /:id returns person', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Hans', surname: 'Weber' }],
      }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe(created.id);
  });

  it('GET /:id returns 404 for nonexistent person', async () => {
    const res = await app.request('/nonexistent-id');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('PATCH /:id updates person', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Old', surname: 'Name' }],
        sex: 'male',
      }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sex: 'female' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.sex).toBe('female');
  });

  it('DELETE /:id soft-deletes person', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Doomed', surname: 'Person' }],
      }),
    });
    const { data: created } = await createRes.json();

    const res = await app.request(`/${created.id}`, { method: 'DELETE' });
    expect(res.status).toBe(204);

    // Should now be 404
    const getRes = await app.request(`/${created.id}`);
    expect(getRes.status).toBe(404);
  });

  it('POST /:id/events creates an event', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Test', surname: 'Person' }],
      }),
    });
    const { data: person } = await createRes.json();

    const res = await app.request(`/${person.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'birth' }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.type).toBe('birth');
  });

  it('POST /:id/events with endDate persists both dates', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Span', surname: 'Test' }],
      }),
    });
    const { data: person } = await createRes.json();

    const res = await app.request(`/${person.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'residence',
        date: { type: 'exact', date: '1920' },
        endDate: { type: 'exact', date: '1970' },
        description: 'Munich',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.type).toBe('residence');
    expect(body.data.date).not.toBeNull();
    expect(body.data.endDate).not.toBeNull();

    // Verify JSON round-trip
    const dateObj = JSON.parse(body.data.date);
    const endDateObj = JSON.parse(body.data.endDate);
    expect(dateObj).toEqual({ type: 'exact', date: '1920' });
    expect(endDateObj).toEqual({ type: 'exact', date: '1970' });
  });

  it('PATCH /:id/events/:eventId updates endDate', async () => {
    const createRes = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        names: [{ given: 'Patch', surname: 'Test' }],
      }),
    });
    const { data: person } = await createRes.json();

    // Create event without endDate
    const eventRes = await app.request(`/${person.id}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'occupation', date: { type: 'exact', date: '1950' } }),
    });
    const { data: event } = await eventRes.json();
    expect(event.endDate).toBeNull();

    // Add endDate via PATCH
    const patchRes = await app.request(`/${person.id}/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endDate: { type: 'exact', date: '1985' } }),
    });

    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.ok).toBe(true);
    expect(patchBody.data.endDate).not.toBeNull();
    expect(JSON.parse(patchBody.data.endDate)).toEqual({ type: 'exact', date: '1985' });
  });
});
