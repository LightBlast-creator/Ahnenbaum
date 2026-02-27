/**
 * Request logger middleware unit tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { requestLogger } from './request-logger';

function createTestApp(): Hono {
  const app = new Hono();
  app.use('*', requestLogger);
  app.get('/health', (c) => c.text('ok'));
  app.get('/api/test', (c) => c.text('data'));
  app.get('/api/error', (c) => c.text('not found', 404));
  app.get('/api/server-error', (c) => c.text('boom', 500));
  return app;
}

describe('requestLogger', () => {
  it('skips /health endpoint', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const app = createTestApp();

    await app.request('/health');

    // Should not have logged the /health request
    const healthLogs = infoSpy.mock.calls.filter((call) => String(call[0]).includes('/health'));
    expect(healthLogs).toHaveLength(0);

    infoSpy.mockRestore();
  });

  it('logs successful requests with info', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const app = createTestApp();

    await app.request('/api/test');

    const logs = infoSpy.mock.calls.filter((call) => String(call[0]).includes('/api/test'));
    expect(logs.length).toBeGreaterThanOrEqual(1);

    infoSpy.mockRestore();
  });

  it('logs 4xx responses with warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = createTestApp();

    await app.request('/api/error');

    const logs = warnSpy.mock.calls.filter((call) => String(call[0]).includes('/api/error'));
    expect(logs.length).toBeGreaterThanOrEqual(1);

    warnSpy.mockRestore();
  });

  it('logs 5xx responses with error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = createTestApp();

    await app.request('/api/server-error');

    const logs = errorSpy.mock.calls.filter((call) =>
      String(call[0]).includes('/api/server-error'),
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);

    errorSpy.mockRestore();
  });
});
