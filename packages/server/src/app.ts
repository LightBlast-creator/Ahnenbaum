import { Hono } from 'hono';
import { APP_NAME, APP_VERSION } from '@ahnenbaum/core';
import type { HealthStatus } from '@ahnenbaum/core';

const app = new Hono();

app.get('/health', (c) => {
  const response: HealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
  };
  return c.json(response);
});

app.get('/', (c) => {
  return c.text(`${APP_NAME} API — v${APP_VERSION}`);
});

export { app };
