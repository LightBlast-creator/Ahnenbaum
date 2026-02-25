/**
 * Source & Citation service integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as sourceService from './source-service';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('sourceService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  // ── Sources ──────────────────────────────────────────────────────

  it('creates a source', () => {
    const result = sourceService.createSource(db, { title: 'Parish Register' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe('Parish Register');
  });

  it('validates source title is required', () => {
    const result = sourceService.createSource(db, { title: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('fetches a source with its citations', () => {
    const source = sourceService.createSource(db, { title: 'Census 1900' });
    if (!source.ok) throw new Error('setup');

    sourceService.createCitation(db, { sourceId: source.data.id, detail: 'Entry A' });
    sourceService.createCitation(db, { sourceId: source.data.id, detail: 'Entry B' });

    const result = sourceService.getSourceById(db, source.data.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.citations).toHaveLength(2);
  });

  it('searches sources by title', () => {
    sourceService.createSource(db, { title: 'Parish Register Munich' });
    sourceService.createSource(db, { title: 'Census 1900' });
    sourceService.createSource(db, { title: 'Parish Register Berlin' });

    const result = sourceService.listSources(db, { search: 'Parish' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.total).toBe(2);
  });

  it('soft-deletes a source', () => {
    const source = sourceService.createSource(db, { title: 'ToDelete' });
    if (!source.ok) throw new Error('setup');

    const del = sourceService.deleteSource(db, source.data.id);
    expect(del.ok).toBe(true);

    const find = sourceService.getSourceById(db, source.data.id);
    expect(find.ok).toBe(false);
  });

  // ── Citations ────────────────────────────────────────────────────

  it('creates a citation linked to a source', () => {
    const source = sourceService.createSource(db, { title: 'Register' });
    if (!source.ok) throw new Error('setup');

    const result = sourceService.createCitation(db, {
      sourceId: source.data.id,
      detail: 'Baptism record, Johann Müller',
      page: '42',
      confidence: 'primary',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sourceId).toBe(source.data.id);
    expect(result.data.page).toBe('42');
    expect(result.data.confidence).toBe('primary');
  });

  it('rejects citation with invalid source', () => {
    const result = sourceService.createCitation(db, {
      sourceId: 'nonexistent',
      detail: 'Should fail',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('updates a citation', () => {
    const source = sourceService.createSource(db, { title: 'Src' });
    if (!source.ok) throw new Error('setup');

    const citation = sourceService.createCitation(db, { sourceId: source.data.id });
    if (!citation.ok) throw new Error('setup');

    const result = sourceService.updateCitation(db, citation.data.id, {
      detail: 'Updated detail',
      confidence: 'secondary',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.detail).toBe('Updated detail');
    expect(result.data.confidence).toBe('secondary');
  });

  it('soft-deletes a citation', () => {
    const source = sourceService.createSource(db, { title: 'Src' });
    if (!source.ok) throw new Error('setup');

    const citation = sourceService.createCitation(db, { sourceId: source.data.id });
    if (!citation.ok) throw new Error('setup');

    const del = sourceService.deleteCitation(db, citation.data.id);
    expect(del.ok).toBe(true);

    const find = sourceService.getCitationById(db, citation.data.id);
    expect(find.ok).toBe(false);
  });
});
