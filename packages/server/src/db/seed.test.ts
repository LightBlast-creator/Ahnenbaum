/**
 * Seed script integration tests.
 */

import { describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { seed } from './seed';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('seed()', () => {
  it('runs without throwing on an in-memory DB', async () => {
    const db = createTestDb();
    await expect(seed(db)).resolves.not.toThrow();
  });

  it('returns correct counts for all entity types', async () => {
    const db = createTestDb();
    const result = await seed(db);

    expect(result.persons).toBe(16);
    expect(result.relationships).toBe(24);
    expect(result.events).toBe(22);
    expect(result.places).toBe(6);
    expect(result.sources).toBe(3);
    expect(result.citations).toBe(3);
    expect(result.media).toBe(0);
  });

  it('is idempotent — running twice produces the same result', async () => {
    const db = createTestDb();
    const first = await seed(db);
    const second = await seed(db);

    expect(second.persons).toBe(first.persons);
    expect(second.relationships).toBe(first.relationships);
    expect(second.events).toBe(first.events);
    expect(second.places).toBe(first.places);
    expect(second.sources).toBe(first.sources);
    expect(second.citations).toBe(first.citations);
  });
});
