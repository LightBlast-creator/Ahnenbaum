import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('GET /health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('version');
  });
});

describe('GET /', () => {
  it('returns the app name', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain('Ahnenbaum');
  });
});
