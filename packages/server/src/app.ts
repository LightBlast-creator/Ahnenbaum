import { Hono } from 'hono';
import { APP_NAME, APP_VERSION } from '@ahnenbaum/core';
import type { HealthStatus } from '@ahnenbaum/core';
import { errorHandler } from './middleware/error-handler';
import { createPersonRoutes } from './routes/persons';
import { createPlaceRoutes } from './routes/places';
import { createSourceRoutes } from './routes/sources';
import { createCitationRoutes } from './routes/citations';
import { createRelationshipRoutes } from './routes/relationships';
import { createMediaRoutes } from './routes/media-routes';
import { createMediaLinkRoutes } from './routes/media-link-routes';
import { createSearchRoutes } from './routes/search-routes';
import { LocalStorageAdapter } from './storage/local-storage';
import type { StorageAdapter } from './storage/local-storage';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * Create the Hono application with all routes.
 *
 * Accepts an optional `db` for testing. Falls back to the singleton
 * when running the real server (from index.ts).
 * Optionally accepts a `storage` adapter for media operations.
 */
export function createApp(db?: BetterSQLite3Database, storage?: StorageAdapter): Hono {
  const app = new Hono();

  // Global error handler — catches unhandled exceptions
  app.onError(errorHandler);

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

  // Mount API routes (only when a db is provided)
  if (db) {
    const mediaStorage = storage ?? new LocalStorageAdapter('data/media');

    app.route('/api/persons', createPersonRoutes(db));
    app.route('/api/places', createPlaceRoutes(db));
    app.route('/api/sources', createSourceRoutes(db));
    app.route('/api/citations', createCitationRoutes(db));
    app.route('/api/relationships', createRelationshipRoutes(db));
    app.route('/api/media', createMediaRoutes(db, mediaStorage));
    app.route('/api/media-links', createMediaLinkRoutes(db));
    app.route('/api/search', createSearchRoutes(db));
  }

  return app;
}

// Default app instance for backward compatibility with existing tests
export const app = createApp();
