/**
 * Tree service — ancestor pedigree and full family graph traversal.
 *
 * Extracted from person-service.ts to separate graph-traversal logic
 * from person CRUD operations.
 *
 * All methods return Result<T> — no thrown exceptions.
 */

import { eq, isNull, and, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, type Result } from '@ahnenbaum/core';
import { PARENT_CHILD_TYPES } from '@ahnenbaum/core';
import { relationships } from '../db/schema/index.ts';
import { persons, personNames } from '../db/schema/persons.ts';
import { events } from '../db/schema/events.ts';
import { media, mediaLinks } from '../db/schema/media.ts';
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

// ── Tree Stats ──────────────────────────────────────────────────────

export interface TreeStats {
  personCount: number;
  mediaCount: number;
  relationshipCount: number;
  eventCount: number;
  // Health indicators
  personsWithoutBirthDate: number;
  orphanPersons: number;
  personsWithoutPhoto: number;
  // Family statistics
  surnameDistribution: { surname: string; count: number }[];
  personsByCentury: { century: string; count: number }[];
  earliestBirthYear: number | null;
  latestBirthYear: number | null;
  averageLifespan: number | null;
}

/**
 * Aggregate tree-wide statistics for the dashboard.
 *
 * Returns counts, health indicators, and family statistics
 * using existing tables — no schema changes required.
 */
export function getTreeStats(db: BetterSQLite3Database): Result<TreeStats> {
  // ── Basic counts ──
  const personCount =
    db
      .select({ cnt: sql<number>`count(*)` })
      .from(persons)
      .where(isNull(persons.deletedAt))
      .get()?.cnt ?? 0;

  const mediaCount =
    db
      .select({ cnt: sql<number>`count(*)` })
      .from(media)
      .where(isNull(media.deletedAt))
      .get()?.cnt ?? 0;

  const relationshipCount =
    db
      .select({ cnt: sql<number>`count(*)` })
      .from(relationships)
      .where(isNull(relationships.deletedAt))
      .get()?.cnt ?? 0;

  const eventCount =
    db
      .select({ cnt: sql<number>`count(*)` })
      .from(events)
      .where(isNull(events.deletedAt))
      .get()?.cnt ?? 0;

  // ── Health indicators ──

  // Persons without a birth event
  const personsWithBirth = db
    .select({ pid: events.personId })
    .from(events)
    .where(and(eq(events.type, 'birth'), isNull(events.deletedAt)))
    .all()
    .map((r) => r.pid);

  const personsWithoutBirthDate = personCount - new Set(personsWithBirth).size;

  // Orphan persons (no relationships at all)
  const personsWithRels = new Set<string>();
  db.select({ a: relationships.personAId, b: relationships.personBId })
    .from(relationships)
    .where(isNull(relationships.deletedAt))
    .all()
    .forEach((r) => {
      personsWithRels.add(r.a);
      personsWithRels.add(r.b);
    });
  const orphanPersons = personCount - personsWithRels.size;

  // Persons without a primary photo
  const personsWithPhoto = db
    .select({ eid: mediaLinks.linkedEntityId })
    .from(mediaLinks)
    .where(and(eq(mediaLinks.linkedEntityType, 'person'), eq(mediaLinks.isPrimary, true)))
    .all()
    .map((r) => r.eid);
  const personsWithoutPhoto = personCount - new Set(personsWithPhoto).size;

  // ── Family statistics ──

  // Surname distribution (top 10)
  const surnameDistribution = db
    .select({
      surname: personNames.surname,
      count: sql<number>`count(*)`,
    })
    .from(personNames)
    .innerJoin(persons, eq(personNames.personId, persons.id))
    .where(and(isNull(persons.deletedAt), eq(personNames.isPreferred, true)))
    .groupBy(personNames.surname)
    .orderBy(sql`count(*) desc`)
    .limit(10)
    .all()
    .filter((r) => r.surname.trim() !== '');

  // Birth year extraction helper: extract year from JSON date field
  // GenealogyDate can be {type:"exact",date:"1985-03-15"} or {type:"range",from:"1850",to:"1860"}
  const yearExpr = sql<string>`substr(COALESCE(json_extract(${events.date}, '$.date'), json_extract(${events.date}, '$.from')), 1, 4)`;

  // Earliest and latest birth years
  const birthYearRange = db
    .select({
      earliest: sql<number | null>`min(cast(${yearExpr} as integer))`,
      latest: sql<number | null>`max(cast(${yearExpr} as integer))`,
    })
    .from(events)
    .where(and(eq(events.type, 'birth'), isNull(events.deletedAt), sql`${events.date} IS NOT NULL`))
    .get();

  const earliestBirthYear = birthYearRange?.earliest ?? null;
  const latestBirthYear = birthYearRange?.latest ?? null;

  // Persons by century
  const centuryExpr = sql<string>`(cast(${yearExpr} as integer) / 100 + 1)`;
  const personsByCentury = db
    .select({
      century: sql<string>`${centuryExpr} || ''`,
      count: sql<number>`count(distinct ${events.personId})`,
    })
    .from(events)
    .where(and(eq(events.type, 'birth'), isNull(events.deletedAt), sql`${events.date} IS NOT NULL`))
    .groupBy(centuryExpr)
    .orderBy(centuryExpr)
    .all()
    .map((r) => ({
      century: `${r.century}00s`,
      count: r.count,
    }));

  // Average lifespan — persons with both birth and death events
  const lifespanResult = db
    .select({
      avg: sql<number | null>`avg(
        cast(substr(COALESCE(json_extract(d.date, '$.date'), json_extract(d.date, '$.from')), 1, 4) as integer)
        - cast(substr(COALESCE(json_extract(b.date, '$.date'), json_extract(b.date, '$.from')), 1, 4) as integer)
      )`,
    })
    .from(sql`events b`)
    .innerJoin(sql`events d`, sql`b.person_id = d.person_id`)
    .where(
      sql`b.type = 'birth' AND d.type = 'death' AND b.deleted_at IS NULL AND d.deleted_at IS NULL AND b.date IS NOT NULL AND d.date IS NOT NULL`,
    )
    .get();

  const averageLifespan = lifespanResult?.avg != null ? Math.round(lifespanResult.avg) : null;

  return ok({
    personCount,
    mediaCount,
    relationshipCount,
    eventCount,
    personsWithoutBirthDate,
    orphanPersons,
    personsWithoutPhoto,
    surnameDistribution,
    personsByCentury,
    earliestBirthYear,
    latestBirthYear,
    averageLifespan,
  });
}
