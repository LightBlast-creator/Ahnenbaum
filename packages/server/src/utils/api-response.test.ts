import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { apiSuccess, apiError } from './api-response';
import type { AppError } from '@ahnenbaum/core';

describe('apiSuccess', () => {
  it('returns 200 with { ok: true, data } by default', async () => {
    const app = new Hono();
    app.get('/test', (c) => apiSuccess(c, { name: 'Alice' }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { name: 'Alice' } });
  });

  it('accepts a custom status code', async () => {
    const app = new Hono();
    app.post('/test', (c) => apiSuccess(c, { id: '123' }, 201));

    const res = await app.request('/test', { method: 'POST' });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { id: '123' } });
  });

  it('handles null data', async () => {
    const app = new Hono();
    app.get('/test', (c) => apiSuccess(c, null));

    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: null });
  });
});

describe('apiError', () => {
  it('maps NOT_FOUND to 404', async () => {
    const app = new Hono();
    const error: AppError = { code: 'NOT_FOUND', message: 'Person not found' };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({ ok: false, error });
  });

  it('maps VALIDATION_ERROR to 400', async () => {
    const app = new Hono();
    const error: AppError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: { name: 'required' },
    };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.details).toEqual({ name: 'required' });
  });

  it('maps CONFLICT to 409', async () => {
    const app = new Hono();
    const error: AppError = { code: 'CONFLICT', message: 'Already exists' };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(409);
  });

  it('maps UNAUTHORIZED to 401', async () => {
    const app = new Hono();
    const error: AppError = { code: 'UNAUTHORIZED', message: 'Not logged in' };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('maps FORBIDDEN to 403', async () => {
    const app = new Hono();
    const error: AppError = { code: 'FORBIDDEN', message: 'No access' };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(403);
  });

  it('maps INTERNAL_ERROR to 500', async () => {
    const app = new Hono();
    const error: AppError = { code: 'INTERNAL_ERROR', message: 'Something broke' };
    app.get('/test', (c) => apiError(c, error));

    const res = await app.request('/test');
    expect(res.status).toBe(500);
  });
});
