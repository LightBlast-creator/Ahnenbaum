/**
 * Tree service — ancestor pedigree and full family graph traversal.
 *
 * Extracted from person-service.ts to separate graph-traversal logic
 * from person CRUD operations.
 *
 * All methods return Result<T> — no thrown exceptions.
 */

import { eq, isNull, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, type Result } from '@ahnenbaum/core';
import { PARENT_CHILD_TYPES } from '@ahnenbaum/core';
import { relationships } from '../db/schema/index.ts';
import { getPersonById, type PersonWithDetailsRow } from './person-service.ts';
import { enrichPersonRows } from './person-enrichment.ts';

// ── Types ────────────────────────────────────────────────────────────

export interface TreeNodeResponse {
  person: PersonWithDetailsRow;
  parents: TreeNodeResponse[];
}

/**
 * Shape returned by getFullFamilyTree — a flat graph of all persons + edges.
 * Used by the full-overview tree page.
 */
export interface FullFamilyTreeResponse {
  persons: PersonWithDetailsRow[];
  relationships: { id: string; personAId: string; personBId: string; type: string }[];
}

// ── Full Family Tree ─────────────────────────────────────────────────

/**
 * Fetch all persons and relationships for the global family graph overview.
 *
 * Uses the shared enrichPersonRows helper for bulk loading.
 * Relationships are a separate query.
 */
export function getFullFamilyTree(db: BetterSQLite3Database): Result<FullFamilyTreeResponse> {
  // Load all non-deleted persons with names, events, and primary media
  const enrichedPersons = enrichPersonRows(db);

  // All non-deleted relationships (project to only the fields needed for graph rendering)
  const allRels = db
    .select({
      id: relationships.id,
      personAId: relationships.personAId,
      personBId: relationships.personBId,
      type: relationships.type,
    })
    .from(relationships)
    .where(isNull(relationships.deletedAt))
    .all();

  return ok({ persons: enrichedPersons, relationships: allRels });
}

// ── Ancestor Tree ───────────────────────────────────────────────────

/**
 * Build an ancestor tree server-side by recursively walking parent relationships.
 *
 * Convention: In a parent-child relationship, personA = parent, personB = child.
 */
export function buildAncestorTree(
  db: BetterSQLite3Database,
  rootId: string,
  maxGenerations: number = 4,
): Result<TreeNodeResponse | null> {
  function buildNode(personId: string, depth: number): TreeNodeResponse | null {
    const result = getPersonById(db, personId);
    if (!result.ok) return null;

    const person = result.data;
    const personWithDetails: PersonWithDetailsRow = {
      id: person.id,
      sex: person.sex,
      notes: person.notes,
      privacy: person.privacy,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      names: person.names,
      events: person.events,
      primaryMediaId: person.primaryMediaId,
    };

    if (depth <= 1) {
      return { person: personWithDetails, parents: [] };
    }

    // Find parent relationships where this person is the child (personBId)
    const parentRels = db
      .select()
      .from(relationships)
      .where(and(eq(relationships.personBId, personId), isNull(relationships.deletedAt)))
      .all()
      .filter((r) => (PARENT_CHILD_TYPES as readonly string[]).includes(r.type));

    const parents = parentRels
      .map((r) => buildNode(r.personAId, depth - 1))
      .filter((n): n is TreeNodeResponse => n !== null);

    return { person: personWithDetails, parents };
  }

  const tree = buildNode(rootId, maxGenerations);
  return ok(tree);
}
