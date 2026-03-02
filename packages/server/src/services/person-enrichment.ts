/**
 * Person enrichment — shared helper for bulk-loading names, events,
 * and primary media data for a set of person IDs.
 *
 * Eliminates the duplicated Map-building pattern previously copy-pasted
 * across person-service, tree-service, and extended-family-service.
 *
 * All queries use `inArray` filtering — no full-table scans.
 */

import { eq, and, isNull, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { persons, personNames, events, mediaLinks } from '../db/schema/index.ts';
import type { PersonWithDetailsRow } from './person-service.ts';

/**
 * Bulk-load names, events, and primary media for the given person IDs,
 * then assemble `PersonWithDetailsRow[]`.
 *
 * When `personIds` is omitted (undefined), loads ALL non-deleted persons
 * and their associated data — used by the full family tree endpoint.
 */
export function enrichPersonRows(
  db: BetterSQLite3Database,
  personIds?: string[],
): PersonWithDetailsRow[] {
  // 1) Fetch person rows
  const personRows = personIds
    ? db
        .select()
        .from(persons)
        .where(
          and(isNull(persons.deletedAt), inArray(persons.id, personIds as [string, ...string[]])),
        )
        .all()
    : db.select().from(persons).where(isNull(persons.deletedAt)).all();

  if (personRows.length === 0) return [];

  const ids = personRows.map((p) => p.id);

  // 2) Bulk-load names (scoped to person IDs)
  const allNames = db
    .select()
    .from(personNames)
    .where(inArray(personNames.personId, ids as [string, ...string[]]))
    .all();

  const namesByPerson = new Map<string, typeof allNames>();
  for (const name of allNames) {
    const list = namesByPerson.get(name.personId) ?? [];
    list.push(name);
    namesByPerson.set(name.personId, list);
  }

  // 3) Bulk-load events (scoped to person IDs, non-deleted)
  const allEvents = db
    .select()
    .from(events)
    .where(and(isNull(events.deletedAt), inArray(events.personId, ids as [string, ...string[]])))
    .all();

  const eventsByPerson = new Map<string, typeof allEvents>();
  for (const event of allEvents) {
    if (!event.personId) continue;
    const list = eventsByPerson.get(event.personId) ?? [];
    list.push(event);
    eventsByPerson.set(event.personId, list);
  }

  // 4) Bulk-load primary media links (scoped to person IDs)
  const primaryLinks = db
    .select({ entityId: mediaLinks.linkedEntityId, mediaId: mediaLinks.mediaId })
    .from(mediaLinks)
    .where(
      and(
        eq(mediaLinks.linkedEntityType, 'person'),
        eq(mediaLinks.isPrimary, true),
        inArray(mediaLinks.linkedEntityId, ids as [string, ...string[]]),
      ),
    )
    .all();
  const primaryMap = new Map(primaryLinks.map((l) => [l.entityId, l.mediaId]));

  // 5) Assemble enriched rows
  return personRows.map((person) => ({
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
}

/**
 * Build a Map from person IDs to enriched rows.
 * Convenience wrapper for services that need random-access lookup.
 */
export function enrichPersonRowsMap(
  db: BetterSQLite3Database,
  personIds: string[],
): Map<string, PersonWithDetailsRow> {
  const rows = enrichPersonRows(db, personIds);
  return new Map(rows.map((r) => [r.id, r]));
}
