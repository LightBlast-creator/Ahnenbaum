/**
 * Request logger middleware — logs HTTP request/response info.
 *
 * Excludes /health endpoint to avoid log spam from monitoring.
 */

import { createMiddleware } from 'hono/factory';
import { createLogger } from './logger';

const logger = createLogger('http');

export const requestLogger = createMiddleware(async (c, next) => {
  // Skip health checks
  if (c.req.path === '/health') {
    await next();
    return;
  }

  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;

  const logFn = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;

  logFn(`${method} ${path} ${status}`, {
    method,
    path,
    status,
    duration_ms: duration,
  });
});
