/**
 * Search service — full-text search using SQLite FTS5.
 *
 * Indexes person names, places, event descriptions, source titles,
 * and media captions for cross-entity search with BM25 ranking.
 *
 * All methods return Result<T> — no thrown exceptions.
 */

import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, type Result } from '@ahnenbaum/core';

// ── Types ────────────────────────────────────────────────────────────

export type SearchEntityType = 'person' | 'place' | 'event' | 'source' | 'media';

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface SearchOptions {
  query: string;
  type?: SearchEntityType;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  facets: Record<SearchEntityType, number>;
}

// ── FTS5 setup ───────────────────────────────────────────────────────

/**
 * Create the FTS5 virtual table if it doesn't exist.
 * Called at startup or during tests.
 */
export function ensureSearchIndex(db: BetterSQLite3Database): void {
  // FTS5 virtual table — Drizzle doesn't support these natively,
  // so we use raw SQL.
  db.run(sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      entity_type UNINDEXED,
      entity_id UNINDEXED,
      title,
      content
    )
  `);
}

/**
 * Rebuild the entire search index from existing data.
 * Useful after initial setup or data import.
 */
export function rebuildIndex(db: BetterSQLite3Database): void {
  // Clear existing index
  db.run(sql`DELETE FROM search_index`);

  // Index persons (given + surname)
  db.run(sql`
    INSERT INTO search_index (entity_type, entity_id, title, content)
    SELECT 'person', p.id,
      pn.given || ' ' || pn.surname,
      COALESCE(pn.given, '') || ' ' || COALESCE(pn.surname, '') || ' ' ||
      COALESCE(pn.maiden, '') || ' ' || COALESCE(pn.nickname, '') || ' ' ||
      COALESCE(p.notes, '')
    FROM persons p
    JOIN person_names pn ON pn.person_id = p.id AND pn.is_preferred = 1
    WHERE p.deleted_at IS NULL
  `);

  // Index places
  db.run(sql`
    INSERT INTO search_index (entity_type, entity_id, title, content)
    SELECT 'place', id, name, name
    FROM places
  `);

  // Index events
  db.run(sql`
    INSERT INTO search_index (entity_type, entity_id, title, content)
    SELECT 'event', id, type,
      COALESCE(description, '') || ' ' || COALESCE(notes, '')
    FROM events
    WHERE deleted_at IS NULL
  `);

  // Index sources
  db.run(sql`
    INSERT INTO search_index (entity_type, entity_id, title, content)
    SELECT 'source', id, title,
      COALESCE(title, '') || ' ' || COALESCE(author, '') || ' ' ||
      COALESCE(publisher, '') || ' ' || COALESCE(notes, '')
    FROM sources
  `);

  // Index media
  db.run(sql`
    INSERT INTO search_index (entity_type, entity_id, title, content)
    SELECT 'media', id,
      COALESCE(caption, original_filename),
      COALESCE(caption, '') || ' ' || COALESCE(description, '') || ' ' ||
      COALESCE(original_filename, '')
    FROM media
    WHERE deleted_at IS NULL
  `);
}

// ── Search ───────────────────────────────────────────────────────────

/**
 * Escape FTS5 special characters in user queries.
 * Handles names like O'Brien, Meyer-Schmidt gracefully.
 */
function escapeFts5Query(query: string): string {
  // Remove FTS5 operators and wrap each word in quotes for exact matching
  const cleaned = query.replace(/['"(){}[\]^~*:]/g, ' ').trim();

  if (!cleaned) return '';

  // Split into words and prefix-match each for fuzzy search
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.map((w) => `"${w}"*`).join(' ');
}

/**
 * Search across all indexed entities using FTS5.
 */
export function search(db: BetterSQLite3Database, opts: SearchOptions): Result<SearchResponse> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  // If query is empty, return empty results
  if (!opts.query.trim()) {
    return ok({
      results: [],
      total: 0,
      facets: { person: 0, place: 0, event: 0, source: 0, media: 0 },
    });
  }

  const ftsQuery = escapeFts5Query(opts.query);
  if (!ftsQuery) {
    return ok({
      results: [],
      total: 0,
      facets: { person: 0, place: 0, event: 0, source: 0, media: 0 },
    });
  }

  try {
    // Get total count and facets
    const facetRows = db.all<{ entity_type: string; cnt: number }>(sql`
      SELECT entity_type, COUNT(*) as cnt
      FROM search_index
      WHERE search_index MATCH ${ftsQuery}
      GROUP BY entity_type
    `);

    const facets: Record<SearchEntityType, number> = {
      person: 0,
      place: 0,
      event: 0,
      source: 0,
      media: 0,
    };
    let total = 0;
    for (const row of facetRows) {
      const type = row.entity_type as SearchEntityType;
      if (type in facets) {
        facets[type] = row.cnt;
        total += row.cnt;
      }
    }

    // Get paginated results with BM25 ranking
    let typeFilter = sql``;
    if (opts.type) {
      typeFilter = sql` AND entity_type = ${opts.type}`;
    }

    const resultRows = db.all<{
      entity_type: string;
      entity_id: string;
      title: string;
      content: string;
      score: number;
    }>(sql`
      SELECT entity_type, entity_id, title, content,
             bm25(search_index) as score
      FROM search_index
      WHERE search_index MATCH ${ftsQuery}${typeFilter}
      ORDER BY bm25(search_index)
      LIMIT ${limit} OFFSET ${offset}
    `);

    const results: SearchResult[] = resultRows.map((row) => ({
      type: row.entity_type as SearchEntityType,
      id: row.entity_id,
      title: row.title ?? '',
      snippet: makeSnippet(row.content, opts.query),
      score: Math.abs(row.score),
    }));

    return ok({ results, total, facets });
  } catch {
    // FTS5 query syntax errors should not crash the server
    return ok({
      results: [],
      total: 0,
      facets: { person: 0, place: 0, event: 0, source: 0, media: 0 },
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Create a short snippet from content with matched terms highlighted.
 */
function makeSnippet(content: string, query: string): string {
  if (!content) return '';
  const maxLen = 150;
  const words = query.split(/\s+/).filter(Boolean);

  // Find the position of the first matching word
  const lower = content.toLowerCase();
  let firstMatch = 0;
  for (const word of words) {
    const pos = lower.indexOf(word.toLowerCase());
    if (pos >= 0) {
      firstMatch = pos;
      break;
    }
  }

  // Extract a window around the match
  const start = Math.max(0, firstMatch - 30);
  const end = Math.min(content.length, start + maxLen);
  let snippet = content.slice(start, end).trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < content.length) snippet = snippet + '…';

  return snippet;
}
