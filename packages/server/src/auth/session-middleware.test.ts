/**
 * Session middleware integration tests.
 *
 * Uses a minimal Hono app with the middleware to verify cookie behavior.
 */

import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { sessionMiddleware } from './session-middleware';

function createTestApp(): Hono {
  const app = new Hono();
  app.use('*', sessionMiddleware);
  app.get('/test', (c) => {
    const session = (c as unknown as { var: { session?: unknown } }).var.session;
    return c.json({ session });
  });
  return app;
}

describe('sessionMiddleware', () => {
  it('sets session cookie on first request', async () => {
    const app = createTestApp();
    const res = await app.request('/test');

    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('ahnenbaum_session');
  });

  it('returns session data in response', async () => {
    const app = createTestApp();
    const res = await app.request('/test');
    const body = await res.json();

    expect(body.session).toBeDefined();
    expect(body.session.userId).toBe('default-user');
    expect(body.session.role).toBe('owner');
  });

  it('reuses existing valid session cookie', async () => {
    const app = createTestApp();

    // Create a session with a distinctive createdAt to prove reuse
    const customSession = {
      userId: 'default-user',
      role: 'owner',
      createdAt: '2020-01-01T00:00:00.000Z', // distinctive timestamp
    };
    const cookieValue = `ahnenbaum_session=${encodeURIComponent(JSON.stringify(customSession))}`;

    const res = await app.request('/test', {
      headers: { Cookie: cookieValue },
    });
    const body = await res.json();

    // If cookie was truly reused, createdAt should match our custom timestamp
    expect(body.session.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(body.session.userId).toBe('default-user');
  });

  it('creates new session on malformed cookie', async () => {
    const app = createTestApp();

    const res = await app.request('/test', {
      headers: { Cookie: 'ahnenbaum_session=not-valid-json' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.userId).toBe('default-user');
  });
});
