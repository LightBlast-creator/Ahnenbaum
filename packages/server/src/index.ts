import { serve } from '@hono/node-server';
import { APP_NAME } from '@ahnenbaum/core';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createApp } from './app';
import { createDb } from './db/connection';
import { PluginManager } from './plugin-runtime/plugin-manager';
import { EventBus } from './plugin-runtime/event-bus';
import { PluginRouteRegistry } from './plugin-runtime/plugin-route-mount';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BackupScheduler } from './backup/backup-scheduler';
import { ensureDataDirs, DATA_DIR } from './paths';

// ── Process safety net — log instead of crashing silently ────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});

// ── Resolve paths relative to this file (works in Docker + local) ────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Ensure data directories exist ────────────────────────────────────
ensureDataDirs();
console.info(`[Server] DATA_DIR: ${DATA_DIR}`);

// ── Boot database ────────────────────────────────────────────────────
const { db, sqlite } = createDb();
migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') });

// ── Initialize plugin system ─────────────────────────────────────────
const eventBus = new EventBus();
const routeRegistry = new PluginRouteRegistry();
const pluginManager = new PluginManager(db, sqlite, eventBus, routeRegistry);

const pluginDir = process.env.PLUGIN_DIR ?? resolve(__dirname, '../../plugins');

// ── Create app and start server ──────────────────────────────────────
const app = createApp(db, undefined, pluginManager);
const port = Number(process.env.PORT) || 3900;

async function boot() {
  // Load plugins (non-blocking — server starts even if plugins fail)
  try {
    await pluginManager.loadAll(pluginDir);
    console.info(`[Server] Loaded ${pluginManager.activeCount()} plugin(s)`);
  } catch (err) {
    console.error('[Server] Plugin loading failed:', err);
  }

  // Start backup scheduler
  const backupScheduler = new BackupScheduler(sqlite);
  backupScheduler.start();

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`${APP_NAME} server running on http://localhost:${info.port}`);
    console.log(`  Database: ${sqlite.name}`);
    console.log(`  Plugins:  ${pluginManager.activeCount()} active`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────
  async function shutdown(signal: string) {
    console.info(`[Server] ${signal} received — shutting down`);

    backupScheduler.stop();

    // Create a safety snapshot before going down
    await backupScheduler.runShutdownBackup();

    try {
      await pluginManager.deactivateAll();
    } catch (err) {
      console.error('[Server] Plugin deactivation error:', err);
    }

    try {
      sqlite.close();
    } catch {
      // Already closed
    }

    server.close(() => {
      console.info('[Server] Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

boot().catch((err) => {
  console.error('[Server] Fatal boot error:', err);
  process.exit(1);
});
