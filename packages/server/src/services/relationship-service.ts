/**
 * Relationship service — typed edge graph management.
 */

import { eq, or, isNull, and, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate, RelationshipRow } from '@ahnenbaum/core';
import { PARENT_CHILD_TYPES, PARTNER_TYPES } from '@ahnenbaum/core';
import { relationships, events, mediaLinks } from '../db/schema/index.ts';
import { mustGet, countRows } from '../db/db-helpers.ts';
import { now, uuid } from '../db/helpers.ts';
import { normalizePagination } from '../utils/pagination.ts';
import { persons } from '../db/schema/persons.ts';

type RelType = typeof relationships.$inferInsert.type;
const PARENT_CHILD_SET = new Set<string>(PARENT_CHILD_TYPES);
const PARTNER_SET = new Set<string>(PARTNER_TYPES);

/**
 * Walk up parent-child edges from `personId` to collect all ancestor IDs.
 * Uses iterative BFS with a visited set to stay safe even if bad data exists.
 */
function getAncestors(db: BetterSQLite3Database, personId: string): Set<string> {
  const ancestors = new Set<string>();
  const queue: string[] = [personId];
  const parentChildTypes = PARENT_CHILD_TYPES as readonly RelType[];

  let current: string | undefined;
  while ((current = queue.pop()) !== undefined) {
    // Find all parent-child rels where current is the child (personB)
    const parentRels = db
      .select({ parentId: relationships.personAId })
      .from(relationships)
      .where(
        and(
          isNull(relationships.deletedAt),
          eq(relationships.personBId, current),
          inArray(relationships.type, parentChildTypes as [RelType, ...RelType[]]),
        ),
      )
      .all();

    for (const { parentId } of parentRels) {
      if (!ancestors.has(parentId)) {
        ancestors.add(parentId);
        queue.push(parentId);
      }
    }
  }

  return ancestors;
}

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

  // Reject conflicting relationship types between same pair
  // (e.g. can't be both parent-of AND married-to the same person)
  const conflictTypes = PARENT_CHILD_SET.has(input.type)
    ? (PARTNER_TYPES as readonly string[])
    : PARTNER_SET.has(input.type)
      ? (PARENT_CHILD_TYPES as readonly string[])
      : null;

  if (conflictTypes) {
    const conflict = db
      .select()
      .from(relationships)
      .where(
        and(
          isNull(relationships.deletedAt),
          inArray(relationships.type, conflictTypes as [RelType, ...RelType[]]),
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

    if (conflict) {
      return err(
        'VALIDATION_ERROR',
        `Cannot create ${input.type} — a conflicting ${conflict.type} relationship already exists between these persons`,
      );
    }
  }

  // Ancestor/descendant prevention for parent-child edges (A→B):
  //  1. B must not be an ancestor of A (would create a cycle)
  //  2. A must not be an indirect ancestor of B — i.e., A already reaches B
  //     through ≥1 intermediary (the grandmother→grandchild bug).
  //     Direct A→B with a different parent-child subtype IS allowed
  //     (e.g. biological_parent + godparent for the same pair).
  if (PARENT_CHILD_SET.has(input.type)) {
    const ancestorsOfA = getAncestors(db, input.personAId);
    if (ancestorsOfA.has(input.personBId)) {
      return err(
        'VALIDATION_ERROR',
        `Cannot create parent-child relationship: the proposed child is already an ancestor of the proposed parent. This would create a cycle.`,
      );
    }

    // Check #2: walk ancestors of B and see if A shows up.
    // Start from B's existing parents (not B) so a direct A→B edge is excluded.
    const ancestorsOfB = getAncestors(db, input.personBId);
    // Remove direct parents of B — those are fine (allows multiple subtypes)
    const directParentsOfB = db
      .select({ parentId: relationships.personAId })
      .from(relationships)
      .where(
        and(
          isNull(relationships.deletedAt),
          eq(relationships.personBId, input.personBId),
          inArray(relationships.type, PARENT_CHILD_TYPES as readonly [RelType, ...RelType[]]),
        ),
      )
      .all();
    for (const { parentId } of directParentsOfB) {
      ancestorsOfB.delete(parentId);
    }

    if (ancestorsOfB.has(input.personAId)) {
      return err(
        'VALIDATION_ERROR',
        `Cannot create parent-child relationship: the proposed parent is already an ancestor of the proposed child through another path. This would create a cycle.`,
      );
    }
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
  const { limit, offset } = normalizePagination(opts);

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

  // When changing type, validate no cross-type conflict exists
  if (input.type && input.type !== existing.type) {
    const conflictTypes = PARENT_CHILD_SET.has(input.type)
      ? (PARTNER_TYPES as readonly string[])
      : PARTNER_SET.has(input.type)
        ? (PARENT_CHILD_TYPES as readonly string[])
        : null;

    if (conflictTypes) {
      const conflict = db
        .select()
        .from(relationships)
        .where(
          and(
            isNull(relationships.deletedAt),
            inArray(relationships.type, conflictTypes as [RelType, ...RelType[]]),
            or(
              and(
                eq(relationships.personAId, existing.personAId),
                eq(relationships.personBId, existing.personBId),
              ),
              and(
                eq(relationships.personAId, existing.personBId),
                eq(relationships.personBId, existing.personAId),
              ),
            ),
          ),
        )
        .get();

      if (conflict) {
        return err(
          'VALIDATION_ERROR',
          `Cannot change to ${input.type} — a conflicting ${conflict.type} relationship already exists between these persons`,
        );
      }
    }
  }

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

  const timestamp = now();

  // Cascade: soft-delete events attached to this relationship
  db.update(events)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(and(isNull(events.deletedAt), eq(events.relationshipId, id)))
    .run();

  // Cascade: hard-delete media links for this relationship
  db.delete(mediaLinks)
    .where(and(eq(mediaLinks.linkedEntityType, 'relationship'), eq(mediaLinks.linkedEntityId, id)))
    .run();

  // Soft-delete the relationship
  db.update(relationships)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
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

  type RelType = typeof relationships.$inferInsert.type;
  const parentChildTypes = PARENT_CHILD_TYPES as readonly RelType[];

  // Step 1: Find all parents of this person (personB = child = personId)
  const parentRels = db
    .select()
    .from(relationships)
    .where(
      and(
        isNull(relationships.deletedAt),
        eq(relationships.personBId, personId),
        inArray(relationships.type, parentChildTypes as [RelType, ...RelType[]]),
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
        inArray(relationships.type, parentChildTypes as [RelType, ...RelType[]]),
      ),
    )
    .all();

  // Deduplicate and exclude self
  const siblingIds = [...new Set(siblingRels.map((r) => r.personBId))].filter(
    (id) => id !== personId,
  );

  return ok(siblingIds);
}
