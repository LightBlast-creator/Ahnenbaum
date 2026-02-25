import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface DbConnection {
    db: BetterSQLite3Database;
    sqlite: BetterSqlite3.Database;
}

/**
 * Create a new database connection.
 *
 * No module-level side effects — disk I/O only happens when this
 * function is explicitly called.
 *
 * @param url  Path to .db file, `:memory:` for in-memory, or omit
 *             to read from `DATABASE_URL` env (default: `./data/ahnenbaum.db`).
 */
export function createDb(url?: string): DbConnection {
    const dbPath = url ?? process.env.DATABASE_URL ?? './data/ahnenbaum.db';

    // Auto-create parent directory (skip for in-memory databases)
    if (dbPath !== ':memory:') {
        mkdirSync(dirname(dbPath), { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');

    const db = drizzle({ client: sqlite });

    return { db, sqlite };
}
