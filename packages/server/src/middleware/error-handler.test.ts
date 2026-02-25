import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from './error-handler';

function createTestApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('catches thrown errors and returns 500 JSON', async () => {
    const app = createTestApp();
    app.get('/boom', () => {
      throw new Error('Something went wrong');
    });

    const res = await app.request('/boom');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Something went wrong');
  });

  it('catches TypeError and returns 500 JSON', async () => {
    const app = createTestApp();
    app.get('/boom', () => {
      throw new TypeError('Cannot read property of undefined');
    });

    const res = await app.request('/boom');
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Cannot read property of undefined');
  });

  it('does not interfere with normal responses', async () => {
    const app = createTestApp();
    app.get('/ok', (c) => c.json({ status: 'fine' }));

    const res = await app.request('/ok');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ status: 'fine' });
  });
});
