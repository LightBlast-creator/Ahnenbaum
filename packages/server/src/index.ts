import { serve } from '@hono/node-server';
import { APP_NAME } from '@ahnenbaum/core';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createApp } from './app';
import { createDb } from './db/connection';

// Boot database and run migrations
const { db, sqlite } = createDb();
migrate(db, { migrationsFolder: './drizzle' });

const app = createApp(db);
const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`${APP_NAME} server running on http://localhost:${info.port}`);
  console.log(`  Database: ${sqlite.name}`);
  console.log(
    `  Routes:   /api/persons, /api/places, /api/sources, /api/citations, /api/relationships`,
  );
});
