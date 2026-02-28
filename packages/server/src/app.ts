import { Hono } from 'hono';
import type { Session } from '@ahnenbaum/core';
import { APP_NAME, APP_VERSION } from '@ahnenbaum/core';
import type { HealthStatus } from '@ahnenbaum/core';
import { errorHandler } from './middleware/error-handler';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { createPersonRoutes } from './routes/persons';
import { createPlaceRoutes } from './routes/places';
import { createSourceRoutes } from './routes/sources';
import { createCitationRoutes } from './routes/citations';
import { createRelationshipRoutes } from './routes/relationships';
import { createMediaRoutes } from './routes/media-routes';
import { createMediaLinkRoutes } from './routes/media-link-routes';
import { createSearchRoutes } from './routes/search-routes';
import { createTreeRoutes } from './routes/tree-routes';
import { LocalStorageAdapter } from './storage/local-storage';
import { MEDIA_DIR } from './paths';
import type { StorageAdapter } from './storage/local-storage';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PluginManager } from './plugin-runtime/plugin-manager';
import { sessionMiddleware } from './auth/session-middleware';
import { requestLogger } from './logging/request-logger';

/**
 * Create the Hono application with all routes.
 *
 * Accepts an optional `db` for testing. Falls back to the singleton
 * when running the real server (from index.ts).
 * Optionally accepts a `storage` adapter for media operations.
 * Optionally accepts a `pluginManager` for the plugin system.
 */
export function createApp(
  db?: BetterSQLite3Database,
  storage?: StorageAdapter,
  pluginManager?: PluginManager,
): Hono {
  const app = new Hono();

  // Global error handler — catches unhandled exceptions
  app.onError(errorHandler);

  // Middleware
  app.use('*', requestLogger);
  app.use('*', sessionMiddleware);

  // ── Session endpoint ─────────────────────────────────────────────
  app.get('/api/session', (c) => {
    const session = (c as unknown as { var: { session?: Session } }).var.session;
    return c.json({ ok: true, data: session ?? null });
  });

  // ── Health endpoint ──────────────────────────────────────────────
  app.get('/health', (c) => {
    const response: HealthStatus & Record<string, unknown> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage.rss() / 1024 / 1024),
      plugin_count: pluginManager?.activeCount() ?? 0,
    };
    return c.json(response);
  });

  // ── Plugin list endpoint ───────────────────────────────────────
  app.get('/api/plugins', (c) => {
    const plugins = pluginManager?.list() ?? [];
    return c.json({ ok: true, data: plugins });
  });

  // Mount API routes (only when a db is provided)
  if (db) {
    const mediaStorage = storage ?? new LocalStorageAdapter(MEDIA_DIR);
    const eventBus = pluginManager?.getEventBus();

    app.route('/api/persons', createPersonRoutes(db, eventBus));
    app.route('/api/places', createPlaceRoutes(db));
    app.route('/api/sources', createSourceRoutes(db));
    app.route('/api/citations', createCitationRoutes(db));
    app.route('/api/relationships', createRelationshipRoutes(db, eventBus));
    app.route('/api/media', createMediaRoutes(db, mediaStorage, eventBus));
    app.route('/api/media-links', createMediaLinkRoutes(db));
    app.route('/api/search', createSearchRoutes(db));
    app.route('/api/tree', createTreeRoutes(db));
  }

  // Mount plugin routes (separate prefix to avoid conflict with GET /api/plugins)
  if (pluginManager) {
    const pluginRouter = pluginManager.getRouteRegistry().getRouter();
    app.route('/api/plugin-routes', pluginRouter);
  }

  // ── Client static files (SPA) ──────────────────────────────────
  const __file = fileURLToPath(import.meta.url);
  const __dir = dirname(__file);
  const clientDir = resolve(__dir, '../../client/build');
  const fallbackPath = resolve(clientDir, '200.html');
  const hasFallback = existsSync(fallbackPath);

  if (hasFallback) {
    // Serve static assets (JS, CSS, images)
    app.use(
      '*',
      serveStatic({
        root: clientDir,
        rewriteRequestPath: (path) => path,
      }),
    );

    // SPA fallback — any unmatched route gets the shell HTML
    app.get('*', (c) => {
      const html = readFileSync(fallbackPath, 'utf-8');
      return c.html(html);
    });
  } else {
    // No client build available — show API info
    app.get('/', (c) => {
      return c.text(`${APP_NAME} API — v${APP_VERSION}`);
    });
  }

  return app;
}

// Default app instance for backward compatibility with existing tests
export const app = createApp();
