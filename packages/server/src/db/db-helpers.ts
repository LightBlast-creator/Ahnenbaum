/**
 * Shared database helpers — safe wrappers for common Drizzle patterns.
 *
 * These helpers eliminate `get()!` non-null assertions while maintaining
 * type safety and providing clear error messages.
 */

import { sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

/**
 * Execute a `.get()` query and throw if the result is undefined.
 *
 * Only use when you are certain a row exists (e.g., immediately
 * after an INSERT or when guarded by a prior existence check).
 */
export function mustGet<T>(result: T | undefined, message = 'Expected row not found'): T {
  if (result === undefined) {
    throw new Error(message);
  }
  return result;
}

/**
 * Count rows in a table with an optional where clause.
 *
 * `count(*)` always returns a result row, so this is inherently safe.
 */
export function countRows(db: BetterSQLite3Database, table: SQLiteTable, where?: SQL): number {
  const query = db.select({ count: sql<number>`count(*)` }).from(table);
  const row = where ? query.where(where).get() : query.get();
  return row?.count ?? 0;
}
