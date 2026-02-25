/**
 * Place service — business logic for hierarchical places.
 */

import { eq, isNull, like, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import { places } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';

// ── Types ────────────────────────────────────────────────────────────

export interface CreatePlaceInput {
  name: string;
  parentId?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdatePlaceInput {
  name?: string;
  parentId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PlaceRow {
  id: string;
  name: string;
  parentId: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

/** Walk the parent chain to build the full hierarchy path. */
function getAncestors(db: BetterSQLite3Database, parentId: string | null): PlaceRow[] {
  const ancestors: PlaceRow[] = [];
  let current = parentId;
  while (current) {
    const parent = db.select().from(places).where(eq(places.id, current)).get();
    if (!parent || parent.deletedAt) break;
    ancestors.push(parent);
    current = parent.parentId;
  }
  return ancestors;
}

// ── Service methods ──────────────────────────────────────────────────

export function createPlace(db: BetterSQLite3Database, input: CreatePlaceInput): Result<PlaceRow> {
  if (!input.name || input.name.trim().length === 0) {
    return err('VALIDATION_ERROR', 'Place name is required', { name: 'required' });
  }

  // Validate parent exists if specified
  if (input.parentId) {
    const parent = db.select().from(places).where(eq(places.id, input.parentId)).get();
    if (!parent || parent.deletedAt) {
      return err('NOT_FOUND', `Parent place '${input.parentId}' not found`);
    }
  }

  const timestamp = now();
  const id = uuid();

  db.insert(places)
    .values({
      id,
      name: input.name.trim(),
      parentId: input.parentId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(places).where(eq(places.id, id)).get()));
}

export function getPlaceById(
  db: BetterSQLite3Database,
  id: string,
): Result<PlaceRow & { ancestors: PlaceRow[]; children: PlaceRow[] }> {
  const place = db.select().from(places).where(eq(places.id, id)).get();
  if (!place || place.deletedAt) {
    return err('NOT_FOUND', `Place with id '${id}' not found`);
  }

  const ancestors = getAncestors(db, place.parentId);
  const children = db
    .select()
    .from(places)
    .where(eq(places.parentId, id))
    .all()
    .filter((p) => !p.deletedAt);

  return ok({ ...place, ancestors, children });
}

export function listPlaces(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number; search?: string } = {},
): Result<{ places: PlaceRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  let whereClause: SQL = isNull(places.deletedAt);
  if (opts.search) {
    whereClause = sql`${isNull(places.deletedAt)} AND ${like(places.name, `%${opts.search}%`)}`;
  }

  const total = countRows(db, places, whereClause);

  const rows = db.select().from(places).where(whereClause).limit(limit).offset(offset).all();

  return ok({ places: rows, total });
}

export function updatePlace(
  db: BetterSQLite3Database,
  id: string,
  input: UpdatePlaceInput,
): Result<PlaceRow> {
  const existing = db.select().from(places).where(eq(places.id, id)).get();
  if (!existing || existing.deletedAt) {
    return err('NOT_FOUND', `Place with id '${id}' not found`);
  }

  db.update(places)
    .set({
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.latitude !== undefined && { latitude: input.latitude }),
      ...(input.longitude !== undefined && { longitude: input.longitude }),
      updatedAt: now(),
    })
    .where(eq(places.id, id))
    .run();

  return ok(mustGet(db.select().from(places).where(eq(places.id, id)).get()));
}

export function deletePlace(db: BetterSQLite3Database, id: string): Result<void> {
  const existing = db.select().from(places).where(eq(places.id, id)).get();
  if (!existing || existing.deletedAt) {
    return err('NOT_FOUND', `Place with id '${id}' not found`);
  }

  db.update(places).set({ deletedAt: now(), updatedAt: now() }).where(eq(places.id, id)).run();

  return ok(undefined);
}

/**
 * Find a place by name or create it — de-duplication helper.
 */
export function findOrCreatePlace(
  db: BetterSQLite3Database,
  name: string,
  parentId?: string,
): Result<PlaceRow> {
  const trimmed = name.trim();
  if (!trimmed) {
    return err('VALIDATION_ERROR', 'Place name is required');
  }

  // Try exact name match (case-sensitive)
  const existing = db
    .select()
    .from(places)
    .where(eq(places.name, trimmed))
    .all()
    .filter((p) => !p.deletedAt);

  if (existing.length > 0) {
    return ok(existing[0]);
  }

  return createPlace(db, { name: trimmed, parentId });
}
