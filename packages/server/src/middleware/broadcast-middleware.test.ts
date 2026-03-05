/**
 * Broadcast middleware unit tests.
 *
 * Verifies that the middleware broadcasts on successful mutations
 * and stays silent on GETs, errors, and missing hub.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { createBroadcastMiddleware } from './broadcast-middleware.ts';
import { WsHub } from '../ws/ws-hub.ts';
import type { WsMessage } from '@ahnenbaum/core';

describe('createBroadcastMiddleware', () => {
  let hub: WsHub;

  beforeEach(() => {
    hub = new WsHub();
  });

  afterEach(() => {
    hub.shutdown();
  });

  function createTestApp(wsHub?: WsHub) {
    const app = new Hono();
    app.use('/api/*', createBroadcastMiddleware(wsHub));

    // Test routes
    app.get('/api/test', (c) => c.json({ ok: true }));
    app.post('/api/persons', (c) => c.json({ ok: true, data: {} }, 201));
    app.patch('/api/persons/:id', (c) => c.json({ ok: true, data: {} }));
    app.delete('/api/persons/:id', (c) => c.body(null, 204));
    app.patch('/api/persons/:id/names/:nameId', (c) => c.json({ ok: true, data: {} }));
    app.post('/api/fail', (c) =>
      c.json({ ok: false, error: { code: 'BAD', message: 'nope' } }, 400),
    );

    return app;
  }

  it('broadcasts on successful POST', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/persons', { method: 'POST', body: '{}' });

    expect(broadcastSpy).toHaveBeenCalledOnce();
    const msg = broadcastSpy.mock.calls[0][0] as WsMessage;
    expect(msg.type).toBe('data.changed');
    expect(msg.payload).toMatchObject({ resource: 'persons', method: 'POST' });
  });

  it('broadcasts on successful PATCH', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/persons/123', { method: 'PATCH', body: '{}' });

    expect(broadcastSpy).toHaveBeenCalledOnce();
    expect(broadcastSpy.mock.calls[0][0].payload).toMatchObject({
      resource: 'persons',
      method: 'PATCH',
    });
  });

  it('broadcasts on successful DELETE', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/persons/123', { method: 'DELETE' });

    expect(broadcastSpy).toHaveBeenCalledOnce();
  });

  it('broadcasts on nested routes (e.g. name update)', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/persons/123/names/456', { method: 'PATCH', body: '{}' });

    expect(broadcastSpy).toHaveBeenCalledOnce();
    expect(broadcastSpy.mock.calls[0][0].payload).toMatchObject({ resource: 'persons' });
  });

  it('does NOT broadcast on GET requests', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/test');

    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it('does NOT broadcast on error responses', async () => {
    const broadcastSpy = vi.spyOn(hub, 'broadcast');
    const app = createTestApp(hub);

    await app.request('/api/fail', { method: 'POST', body: '{}' });

    expect(broadcastSpy).not.toHaveBeenCalled();
  });

  it('is a no-op when hub is undefined', async () => {
    const app = createTestApp(undefined);

    // Should not throw
    const res = await app.request('/api/persons', { method: 'POST', body: '{}' });
    expect(res.status).toBe(201);
  });
});
