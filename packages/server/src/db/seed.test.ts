import { describe, expect, it, afterEach } from 'vitest';
import { createDb, type DbConnection } from './connection';
import { seed, type SeedResult } from './seed';

describe('seed()', () => {
  let conn: DbConnection | undefined;

  afterEach(() => {
    conn?.sqlite.close();
    conn = undefined;
  });

  it('runs without throwing on an in-memory DB', () => {
    conn = createDb(':memory:');
    expect(() => seed(conn as DbConnection)).not.toThrow();
  });

  it('returns a summary with all-zero counts', () => {
    conn = createDb(':memory:');
    const result: SeedResult = seed(conn as DbConnection);

    expect(result).toEqual({
      persons: 0,
      relationships: 0,
      events: 0,
      places: 0,
      sources: 0,
      media: 0,
    });
  });

  it('is idempotent — running twice produces the same result', () => {
    conn = createDb(':memory:');
    const first = seed(conn as DbConnection);
    const second = seed(conn as DbConnection);

    expect(first).toEqual(second);
  });
});
