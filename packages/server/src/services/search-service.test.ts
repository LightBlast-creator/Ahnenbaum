/**
 * Search service integration tests.
 *
 * Uses an in-memory SQLite database with schema applied via migrate().
 * Tests FTS5 index creation, indexing, and search functionality.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as searchService from './search-service';
import * as personService from './person-service';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('searchService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
    searchService.ensureSearchIndex(db);
  });

  // ── Index creation ────────────────────────────────────────────────

  it('creates FTS5 virtual table without error', () => {
    // ensureSearchIndex already called in beforeEach — just verify no errors
    expect(true).toBe(true);
  });

  it('can call ensureSearchIndex multiple times (idempotent)', () => {
    searchService.ensureSearchIndex(db);
    searchService.ensureSearchIndex(db);
    // Should not throw
    expect(true).toBe(true);
  });

  // ── Indexing and searching ────────────────────────────────────────

  it('finds a person after indexing', () => {
    // Create a person
    personService.createPerson(db, {
      sex: 'male',
      names: [{ given: 'Friedrich', surname: 'Müller' }],
    });

    // Rebuild index
    searchService.rebuildIndex(db);

    // Search for them
    const result = searchService.search(db, { query: 'Friedrich' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results.length).toBeGreaterThanOrEqual(1);
    expect(result.data.results[0].type).toBe('person');
    expect(result.data.results[0].title).toContain('Friedrich');
  });

  it('finds a person by surname', () => {
    personService.createPerson(db, {
      names: [{ given: 'Anna', surname: 'Schmidt' }],
    });
    searchService.rebuildIndex(db);

    const result = searchService.search(db, { query: 'Schmidt' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results.length).toBeGreaterThanOrEqual(1);
  });

  it('handles partial/prefix matches', () => {
    personService.createPerson(db, {
      names: [{ given: 'Maximilian', surname: 'Müller' }],
    });
    searchService.rebuildIndex(db);

    const result = searchService.search(db, { query: 'Maxi' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results.length).toBeGreaterThanOrEqual(1);
  });

  // ── Empty and edge cases ──────────────────────────────────────────

  it('returns empty results for empty query', () => {
    const result = searchService.search(db, { query: '' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results).toHaveLength(0);
    expect(result.data.total).toBe(0);
  });

  it('returns empty results for whitespace-only query', () => {
    const result = searchService.search(db, { query: '   ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results).toHaveLength(0);
  });

  it('handles special characters safely', () => {
    personService.createPerson(db, {
      names: [{ given: 'Patrick', surname: "O'Brien" }],
    });
    searchService.rebuildIndex(db);

    // Should not throw
    const result = searchService.search(db, { query: "O'Brien" });
    expect(result.ok).toBe(true);
  });

  it('handles FTS5 operator characters safely', () => {
    const result = searchService.search(db, { query: 'test AND OR NOT *' });
    expect(result.ok).toBe(true);
  });

  // ── Facets ────────────────────────────────────────────────────────

  it('returns facet counts per entity type', () => {
    personService.createPerson(db, {
      names: [{ given: 'Test', surname: 'Facets' }],
    });
    personService.createPerson(db, {
      names: [{ given: 'Another', surname: 'Facets' }],
    });
    searchService.rebuildIndex(db);

    const result = searchService.search(db, { query: 'Facets' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.facets.person).toBe(2);
    expect(result.data.total).toBe(2);
  });

  // ── Type filtering ────────────────────────────────────────────────

  it('filters results by entity type', () => {
    personService.createPerson(db, {
      names: [{ given: 'Test', surname: 'Filter' }],
    });
    searchService.rebuildIndex(db);

    // Search with type filter for 'place' should return no results
    const result = searchService.search(db, {
      query: 'Filter',
      type: 'place',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.results).toHaveLength(0);
  });

  // ── Pagination ────────────────────────────────────────────────────

  it('paginates search results', () => {
    for (let i = 0; i < 5; i++) {
      personService.createPerson(db, {
        names: [{ given: `Paginate${i}`, surname: 'TestPagination' }],
      });
    }
    searchService.rebuildIndex(db);

    const page1 = searchService.search(db, {
      query: 'TestPagination',
      page: 1,
      limit: 2,
    });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.data.results).toHaveLength(2);
    expect(page1.data.total).toBe(5);

    const page3 = searchService.search(db, {
      query: 'TestPagination',
      page: 3,
      limit: 2,
    });
    expect(page3.ok).toBe(true);
    if (!page3.ok) return;
    expect(page3.data.results).toHaveLength(1);
  });
});
