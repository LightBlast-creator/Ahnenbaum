/**
 * Source & Citation service — evidence chain management.
 */

import { eq, isNull, like, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import { sources, citations } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';

// ── Types ────────────────────────────────────────────────────────────

export interface CreateSourceInput {
  title: string;
  author?: string;
  publisher?: string;
  publicationDate?: string;
  repositoryName?: string;
  url?: string;
  notes?: string;
}

export interface UpdateSourceInput {
  title?: string;
  author?: string;
  publisher?: string;
  publicationDate?: string;
  repositoryName?: string;
  url?: string;
  notes?: string;
}

export interface CreateCitationInput {
  sourceId: string;
  detail?: string;
  page?: string;
  confidence?: string;
  notes?: string;
}

export interface UpdateCitationInput {
  detail?: string;
  page?: string;
  confidence?: string;
  notes?: string;
}

interface SourceRow {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  repositoryName: string | null;
  url: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CitationRow {
  id: string;
  sourceId: string;
  detail: string | null;
  page: string | null;
  confidence: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function now(): string {
  return new Date().toISOString();
}
function uuid(): string {
  return crypto.randomUUID();
}

// ── Source methods ───────────────────────────────────────────────────

export function createSource(
  db: BetterSQLite3Database,
  input: CreateSourceInput,
): Result<SourceRow> {
  if (!input.title?.trim()) {
    return err('VALIDATION_ERROR', 'Source title is required');
  }

  const timestamp = now();
  const id = uuid();
  db.insert(sources)
    .values({
      id,
      title: input.title.trim(),
      author: input.author ?? null,
      publisher: input.publisher ?? null,
      publicationDate: input.publicationDate ?? null,
      repositoryName: input.repositoryName ?? null,
      url: input.url ?? null,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(sources).where(eq(sources.id, id)).get()));
}

export function getSourceById(
  db: BetterSQLite3Database,
  id: string,
): Result<SourceRow & { citations: CitationRow[] }> {
  const source = db.select().from(sources).where(eq(sources.id, id)).get();
  if (!source || source.deletedAt) return err('NOT_FOUND', `Source '${id}' not found`);

  const sourceCitations = db
    .select()
    .from(citations)
    .where(eq(citations.sourceId, id))
    .all()
    .filter((c) => !c.deletedAt);
  return ok({ ...source, citations: sourceCitations });
}

export function listSources(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number; search?: string } = {},
): Result<{ sources: SourceRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  let whereClause: SQL = isNull(sources.deletedAt);
  if (opts.search) {
    whereClause = sql`${isNull(sources.deletedAt)} AND ${like(sources.title, `%${opts.search}%`)}`;
  }

  const total = countRows(db, sources, whereClause);
  const rows = db.select().from(sources).where(whereClause).limit(limit).offset(offset).all();
  return ok({ sources: rows, total });
}

export function updateSource(
  db: BetterSQLite3Database,
  id: string,
  input: UpdateSourceInput,
): Result<SourceRow> {
  const existing = db.select().from(sources).where(eq(sources.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Source '${id}' not found`);

  db.update(sources)
    .set({
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.author !== undefined && { author: input.author }),
      ...(input.publisher !== undefined && { publisher: input.publisher }),
      ...(input.publicationDate !== undefined && { publicationDate: input.publicationDate }),
      ...(input.repositoryName !== undefined && { repositoryName: input.repositoryName }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.notes !== undefined && { notes: input.notes }),
      updatedAt: now(),
    })
    .where(eq(sources.id, id))
    .run();

  return ok(mustGet(db.select().from(sources).where(eq(sources.id, id)).get()));
}

export function deleteSource(db: BetterSQLite3Database, id: string): Result<void> {
  const existing = db.select().from(sources).where(eq(sources.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Source '${id}' not found`);
  db.update(sources).set({ deletedAt: now(), updatedAt: now() }).where(eq(sources.id, id)).run();
  return ok(undefined);
}

// ── Citation methods ────────────────────────────────────────────────

export function createCitation(
  db: BetterSQLite3Database,
  input: CreateCitationInput,
): Result<CitationRow> {
  const source = db.select().from(sources).where(eq(sources.id, input.sourceId)).get();
  if (!source || source.deletedAt) return err('NOT_FOUND', `Source '${input.sourceId}' not found`);

  const timestamp = now();
  const id = uuid();
  db.insert(citations)
    .values({
      id,
      sourceId: input.sourceId,
      detail: input.detail ?? null,
      page: input.page ?? null,
      confidence: (input.confidence ?? null) as typeof citations.$inferInsert.confidence,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(citations).where(eq(citations.id, id)).get()));
}

export function getCitationById(db: BetterSQLite3Database, id: string): Result<CitationRow> {
  const citation = db.select().from(citations).where(eq(citations.id, id)).get();
  if (!citation || citation.deletedAt) return err('NOT_FOUND', `Citation '${id}' not found`);
  return ok(citation);
}

export function updateCitation(
  db: BetterSQLite3Database,
  id: string,
  input: UpdateCitationInput,
): Result<CitationRow> {
  const existing = db.select().from(citations).where(eq(citations.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Citation '${id}' not found`);

  db.update(citations)
    .set({
      ...(input.detail !== undefined && { detail: input.detail }),
      ...(input.page !== undefined && { page: input.page }),
      ...(input.confidence !== undefined && {
        confidence: input.confidence as typeof citations.$inferInsert.confidence,
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
      updatedAt: now(),
    })
    .where(eq(citations.id, id))
    .run();

  return ok(mustGet(db.select().from(citations).where(eq(citations.id, id)).get()));
}

export function deleteCitation(db: BetterSQLite3Database, id: string): Result<void> {
  const existing = db.select().from(citations).where(eq(citations.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Citation '${id}' not found`);
  db.update(citations)
    .set({ deletedAt: now(), updatedAt: now() })
    .where(eq(citations.id, id))
    .run();
  return ok(undefined);
}
