import type BetterSqlite3 from 'better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createDb, type DbConnection } from './connection';

// Singleton — created once when the server boots.
// Services import { db, sqlite } from './db' to access the singleton.
const connection: DbConnection = createDb();

/** Drizzle ORM instance (singleton). */
export const db: BetterSQLite3Database = connection.db;

/** Raw better-sqlite3 handle (singleton). Use for shutdown/cleanup. */
export const sqlite: BetterSqlite3.Database = connection.sqlite;

export { createDb, type DbConnection } from './connection';
export * from './schema';
