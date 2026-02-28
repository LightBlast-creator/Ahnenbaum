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
import { persons, personNames, events, relationships, mediaLinks } from '../db/schema/index';
import { getPersonById, type PersonWithDetailsRow } from './person-service';

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
 * Uses exactly 3 bulk queries (persons, names, events) instead of N+1.
 * Relationships are a 4th query.
 */
export function getFullFamilyTree(db: BetterSQLite3Database): Result<FullFamilyTreeResponse> {
  // 1) All non-deleted persons
  const allPersons = db.select().from(persons).where(isNull(persons.deletedAt)).all();

  // 2) All names (no deletedAt on names table)
  const allNames = db.select().from(personNames).all();

  // 3) All non-deleted events
  const allEvents = db.select().from(events).where(isNull(events.deletedAt)).all();

  // 4) All non-deleted relationships (project to only the fields needed for graph rendering)
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

  // Assemble in memory
  const namesByPerson = new Map<string, typeof allNames>();
  for (const name of allNames) {
    const list = namesByPerson.get(name.personId) ?? [];
    list.push(name);
    namesByPerson.set(name.personId, list);
  }

  const eventsByPerson = new Map<string, typeof allEvents>();
  for (const event of allEvents) {
    if (!event.personId) continue;
    const list = eventsByPerson.get(event.personId) ?? [];
    list.push(event);
    eventsByPerson.set(event.personId, list);
  }

  // Bulk-load primary media links for all persons
  const allPrimaryLinks = db
    .select({ entityId: mediaLinks.linkedEntityId, mediaId: mediaLinks.mediaId })
    .from(mediaLinks)
    .where(and(eq(mediaLinks.linkedEntityType, 'person'), eq(mediaLinks.isPrimary, true)))
    .all();
  const primaryMap = new Map(allPrimaryLinks.map((l) => [l.entityId, l.mediaId]));

  const enrichedPersons: PersonWithDetailsRow[] = allPersons.map((person) => ({
    id: person.id,
    sex: person.sex,
    notes: person.notes,
    privacy: person.privacy,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    names: namesByPerson.get(person.id) ?? [],
    events: eventsByPerson.get(person.id) ?? [],
    primaryMediaId: primaryMap.get(person.id),
  }));

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
