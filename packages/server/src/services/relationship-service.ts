/**
 * Relationship service — typed edge graph management.
 */

import { eq, or, isNull, and, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { PARENT_CHILD_TYPES } from '@ahnenbaum/core';
import { relationships } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';
import { persons } from '../db/schema/persons';

// ── Types ────────────────────────────────────────────────────────────

export interface CreateRelationshipInput {
  personAId: string;
  personBId: string;
  type: string;
  startDate?: GenealogyDate;
  endDate?: GenealogyDate;
  placeId?: string;
  notes?: string;
}

export interface UpdateRelationshipInput {
  type?: string;
  startDate?: GenealogyDate;
  endDate?: GenealogyDate;
  placeId?: string | null;
  notes?: string;
}

interface RelationshipRow {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  placeId: string | null;
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

// ── Service methods ──────────────────────────────────────────────────

export function createRelationship(
  db: BetterSQLite3Database,
  input: CreateRelationshipInput,
): Result<RelationshipRow> {
  // Validate: no self-relationships
  if (input.personAId === input.personBId) {
    return err('VALIDATION_ERROR', 'Cannot create a relationship between a person and themselves');
  }

  // Validate both persons exist and are not deleted
  const personA = db.select().from(persons).where(eq(persons.id, input.personAId)).get();
  if (!personA || personA.deletedAt) {
    return err('NOT_FOUND', `Person '${input.personAId}' not found`);
  }
  const personB = db.select().from(persons).where(eq(persons.id, input.personBId)).get();
  if (!personB || personB.deletedAt) {
    return err('NOT_FOUND', `Person '${input.personBId}' not found`);
  }

  // Check for duplicate (same two persons, same type)
  const existing = db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.type, input.type as typeof relationships.$inferInsert.type),
        isNull(relationships.deletedAt),
        or(
          and(
            eq(relationships.personAId, input.personAId),
            eq(relationships.personBId, input.personBId),
          ),
          and(
            eq(relationships.personAId, input.personBId),
            eq(relationships.personBId, input.personAId),
          ),
        ),
      ),
    )
    .get();

  if (existing) {
    return err('CONFLICT', 'This relationship already exists');
  }

  const timestamp = now();
  const id = uuid();

  db.insert(relationships)
    .values({
      id,
      personAId: input.personAId,
      personBId: input.personBId,
      type: input.type as typeof relationships.$inferInsert.type,
      startDate: input.startDate ? JSON.stringify(input.startDate) : null,
      endDate: input.endDate ? JSON.stringify(input.endDate) : null,
      placeId: input.placeId ?? null,
      notes: input.notes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(relationships).where(eq(relationships.id, id)).get()));
}

export function getRelationshipById(
  db: BetterSQLite3Database,
  id: string,
): Result<RelationshipRow> {
  const rel = db.select().from(relationships).where(eq(relationships.id, id)).get();
  if (!rel || rel.deletedAt) return err('NOT_FOUND', `Relationship '${id}' not found`);
  return ok(rel);
}

/** Group all relationships involving a person, by type. */
export function getRelationshipsForPerson(
  db: BetterSQLite3Database,
  personId: string,
): Result<Record<string, RelationshipRow[]>> {
  const person = db.select().from(persons).where(eq(persons.id, personId)).get();
  if (!person || person.deletedAt) {
    return err('NOT_FOUND', `Person '${personId}' not found`);
  }

  const all = db
    .select()
    .from(relationships)
    .where(
      and(
        isNull(relationships.deletedAt),
        or(eq(relationships.personAId, personId), eq(relationships.personBId, personId)),
      ),
    )
    .all();

  const grouped: Record<string, RelationshipRow[]> = {};
  for (const rel of all) {
    if (!grouped[rel.type]) grouped[rel.type] = [];
    grouped[rel.type].push(rel);
  }

  return ok(grouped);
}

export function listRelationships(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number } = {},
): Result<{ relationships: RelationshipRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const whereClause = isNull(relationships.deletedAt);
  const total = countRows(db, relationships, whereClause);
  const rows = db.select().from(relationships).where(whereClause).limit(limit).offset(offset).all();

  return ok({ relationships: rows, total });
}

export function updateRelationship(
  db: BetterSQLite3Database,
  id: string,
  input: UpdateRelationshipInput,
): Result<RelationshipRow> {
  const existing = db.select().from(relationships).where(eq(relationships.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Relationship '${id}' not found`);

  db.update(relationships)
    .set({
      ...(input.type !== undefined && {
        type: input.type as typeof relationships.$inferInsert.type,
      }),
      ...(input.startDate !== undefined && { startDate: JSON.stringify(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: JSON.stringify(input.endDate) }),
      ...(input.placeId !== undefined && { placeId: input.placeId }),
      ...(input.notes !== undefined && { notes: input.notes }),
      updatedAt: now(),
    })
    .where(eq(relationships.id, id))
    .run();

  return ok(mustGet(db.select().from(relationships).where(eq(relationships.id, id)).get()));
}

export function deleteRelationship(db: BetterSQLite3Database, id: string): Result<void> {
  const existing = db.select().from(relationships).where(eq(relationships.id, id)).get();
  if (!existing || existing.deletedAt) return err('NOT_FOUND', `Relationship '${id}' not found`);
  db.update(relationships)
    .set({ deletedAt: now(), updatedAt: now() })
    .where(eq(relationships.id, id))
    .run();
  return ok(undefined);
}

/** Derive siblings — other children who share at least one parent. */
export function getSiblingsForPerson(
  db: BetterSQLite3Database,
  personId: string,
): Result<string[]> {
  const person = db.select().from(persons).where(eq(persons.id, personId)).get();
  if (!person || person.deletedAt) {
    return err('NOT_FOUND', `Person '${personId}' not found`);
  }

  const parentChildTypes = PARENT_CHILD_TYPES as readonly string[];

  // Step 1: Find all parents of this person (personB = child = personId)
  const parentRels = db
    .select()
    .from(relationships)
    .where(
      and(
        isNull(relationships.deletedAt),
        eq(relationships.personBId, personId),
        inArray(relationships.type, parentChildTypes as [string, ...string[]]),
      ),
    )
    .all();

  const parentIds = parentRels.map((r) => r.personAId);
  if (parentIds.length === 0) return ok([]);

  // Step 2: Find all other children of those parents
  const siblingRels = db
    .select()
    .from(relationships)
    .where(
      and(
        isNull(relationships.deletedAt),
        inArray(relationships.personAId, parentIds as [string, ...string[]]),
        inArray(relationships.type, parentChildTypes as [string, ...string[]]),
      ),
    )
    .all();

  // Deduplicate and exclude self
  const siblingIds = [...new Set(siblingRels.map((r) => r.personBId))].filter(
    (id) => id !== personId,
  );

  return ok(siblingIds);
}
