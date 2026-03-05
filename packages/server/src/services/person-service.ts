/**
 * Person service — business logic for person CRUD.
 *
 * Event methods (addPersonEvent, updatePersonEvent, deletePersonEvent)
 * are defined in event-service.ts and re-exported here for backward compat.
 *
 * All methods return Result<T> — no thrown exceptions.
 * Database operations use Drizzle ORM against the schema.
 */

import { eq, isNull, and, or } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { persons, personNames, events, mediaLinks, relationships } from '../db/schema/index.ts';
import { enrichPersonRows } from './person-enrichment.ts';
import { mustGet, countRows } from '../db/db-helpers.ts';
import { now, uuid } from '../db/helpers.ts';
import { normalizePagination } from '../utils/pagination.ts';

// Re-export event service for backward compatibility
export { addPersonEvent, updatePersonEvent, deletePersonEvent } from './event-service.ts';
export type { CreateEventInput, UpdateEventInput, EventRow } from './event-service.ts';

// ── Types ────────────────────────────────────────────────────────────

export interface CreatePersonInput {
  sex?: string;
  notes?: string;
  privacy?: string;
  names: CreatePersonNameInput[];
  /** Convenience: auto-creates a birth event if provided. */
  birthDate?: GenealogyDate;
  /** Convenience: auto-creates a death event if provided. */
  deathDate?: GenealogyDate;
}

export interface CreatePersonNameInput {
  given: string;
  surname: string;
  maiden?: string;
  nickname?: string;
  type?: string;
  isPreferred?: boolean;
}

export interface UpdatePersonInput {
  sex?: string;
  notes?: string;
  privacy?: string;
}

import type { EventRow } from './event-service.ts';

interface PersonRow {
  id: string;
  sex: string;
  notes: string | null;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface PersonNameRow {
  id: string;
  personId: string;
  given: string;
  surname: string;
  maiden: string | null;
  nickname: string | null;
  type: string;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Service methods ──────────────────────────────────────────────────

export function createPerson(
  db: BetterSQLite3Database,
  input: CreatePersonInput,
): Result<PersonRow & { names: PersonNameRow[]; events: EventRow[] }> {
  if (!input.names || input.names.length === 0) {
    return err('VALIDATION_ERROR', 'At least one name is required', { names: 'required' });
  }

  const timestamp = now();
  const personId = uuid();

  db.insert(persons)
    .values({
      id: personId,
      sex: (input.sex ?? 'unknown') as 'male' | 'female' | 'intersex' | 'unknown',
      notes: input.notes ?? null,
      privacy: (input.privacy ?? 'public') as 'public' | 'users_only' | 'owner_only',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  const nameRows: PersonNameRow[] = input.names.map((n, i) => {
    const nameId = uuid();
    const row = {
      id: nameId,
      personId,
      given: n.given,
      surname: n.surname,
      maiden: n.maiden ?? null,
      nickname: n.nickname ?? null,
      type: (n.type ?? 'birth') as 'birth' | 'married' | 'alias',
      isPreferred: n.isPreferred ?? i === 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.insert(personNames).values(row).run();
    return row;
  });

  // Auto-create birth/death events when convenience date fields are provided
  const autoEvents: Array<{ type: 'birth' | 'death'; date: GenealogyDate }> = [];
  if (input.birthDate) autoEvents.push({ type: 'birth', date: input.birthDate });
  if (input.deathDate) autoEvents.push({ type: 'death', date: input.deathDate });

  for (const evt of autoEvents) {
    db.insert(events)
      .values({
        id: uuid(),
        type: evt.type as typeof events.$inferInsert.type,
        date: JSON.stringify(evt.date),
        placeId: null,
        personId,
        relationshipId: null,
        description: null,
        notes: null,
        citationId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
  }

  const person = mustGet(db.select().from(persons).where(eq(persons.id, personId)).get());
  const personEvents = db
    .select()
    .from(events)
    .where(eq(events.personId, personId))
    .all()
    .filter((e) => !e.deletedAt);
  return ok({ ...person, names: nameRows, events: personEvents });
}

export function getPersonById(
  db: BetterSQLite3Database,
  id: string,
): Result<PersonRow & { names: PersonNameRow[]; events: EventRow[]; primaryMediaId?: string }> {
  const person = db.select().from(persons).where(eq(persons.id, id)).get();

  if (!person || person.deletedAt) {
    return err('NOT_FOUND', `Person with id '${id}' not found`);
  }

  const names = db.select().from(personNames).where(eq(personNames.personId, id)).all();
  const personEvents = db
    .select()
    .from(events)
    .where(eq(events.personId, id))
    .all()
    .filter((e) => !e.deletedAt);

  // Primary photo lookup
  const primaryLink = db
    .select({ mediaId: mediaLinks.mediaId })
    .from(mediaLinks)
    .where(
      and(
        eq(mediaLinks.linkedEntityType, 'person'),
        eq(mediaLinks.linkedEntityId, id),
        eq(mediaLinks.isPrimary, true),
      ),
    )
    .get();

  return ok({ ...person, names, events: personEvents, primaryMediaId: primaryLink?.mediaId });
}

export function listPersons(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number } = {},
): Result<{ persons: PersonRow[]; total: number }> {
  const { limit, offset } = normalizePagination(opts);

  const whereClause = isNull(persons.deletedAt);

  const total = countRows(db, persons, whereClause);

  const rows = db.select().from(persons).where(whereClause).limit(limit).offset(offset).all();

  return ok({ persons: rows, total });
}

export function updatePerson(
  db: BetterSQLite3Database,
  id: string,
  input: UpdatePersonInput,
): Result<PersonRow> {
  const existing = db.select().from(persons).where(eq(persons.id, id)).get();
  if (!existing || existing.deletedAt) {
    return err('NOT_FOUND', `Person with id '${id}' not found`);
  }

  db.update(persons)
    .set({
      ...(input.sex !== undefined && {
        sex: input.sex as 'male' | 'female' | 'intersex' | 'unknown',
      }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.privacy !== undefined && {
        privacy: input.privacy as 'public' | 'users_only' | 'owner_only',
      }),
      updatedAt: now(),
    })
    .where(eq(persons.id, id))
    .run();

  return ok(mustGet(db.select().from(persons).where(eq(persons.id, id)).get()));
}

export function deletePerson(db: BetterSQLite3Database, id: string): Result<void> {
  const existing = db.select().from(persons).where(eq(persons.id, id)).get();
  if (!existing || existing.deletedAt) {
    return err('NOT_FOUND', `Person with id '${id}' not found`);
  }

  const timestamp = now();

  // Cascade: soft-delete relationships involving this person
  db.update(relationships)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(
      and(
        isNull(relationships.deletedAt),
        or(eq(relationships.personAId, id), eq(relationships.personBId, id)),
      ),
    )
    .run();

  // Cascade: soft-delete events belonging to this person
  db.update(events)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(and(isNull(events.deletedAt), eq(events.personId, id)))
    .run();

  // Cascade: hard-delete person names (no deletedAt column)
  db.delete(personNames).where(eq(personNames.personId, id)).run();

  // Cascade: hard-delete media links for this person
  db.delete(mediaLinks)
    .where(and(eq(mediaLinks.linkedEntityType, 'person'), eq(mediaLinks.linkedEntityId, id)))
    .run();

  // Soft-delete the person
  db.update(persons)
    .set({ deletedAt: timestamp, updatedAt: timestamp })
    .where(eq(persons.id, id))
    .run();

  return ok(undefined);
}

// Person event methods are in event-service.ts, re-exported at the top of this file.

// ── Enriched list ───────────────────────────────────────────────────

export interface PersonWithDetailsRow {
  id: string;
  sex: string;
  notes: string | null;
  privacy: string;
  createdAt: string;
  updatedAt: string;
  names: PersonNameRow[];
  events: EventRow[];
  primaryMediaId?: string;
}

/**
 * List persons with their names and events joined inline.
 * Used by the frontend persons list page.
 */
export function listPersonsWithDetails(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number } = {},
): Result<{ persons: PersonWithDetailsRow[]; total: number }> {
  const { limit, offset } = normalizePagination(opts);

  const whereClause = isNull(persons.deletedAt);
  const total = countRows(db, persons, whereClause);

  const rows = db.select().from(persons).where(whereClause).limit(limit).offset(offset).all();
  const personIds = rows.map((p) => p.id);

  if (personIds.length === 0) return ok({ persons: [], total });

  const enriched = enrichPersonRows(db, personIds);

  return ok({ persons: enriched, total });
}

// ── Name update ─────────────────────────────────────────────────────

export interface UpdatePersonNameInput {
  given?: string;
  surname?: string;
  maiden?: string | null;
  nickname?: string | null;
  type?: string;
  isPreferred?: boolean;
}

/**
 * Update a specific person name row.
 */
export function updatePersonName(
  db: BetterSQLite3Database,
  personId: string,
  nameId: string,
  input: UpdatePersonNameInput,
): Result<PersonNameRow> {
  const person = db.select().from(persons).where(eq(persons.id, personId)).get();
  if (!person || person.deletedAt) {
    return err('NOT_FOUND', `Person '${personId}' not found`);
  }

  const name = db.select().from(personNames).where(eq(personNames.id, nameId)).get();
  if (!name || name.personId !== personId) {
    return err('NOT_FOUND', `Name '${nameId}' not found for person '${personId}'`);
  }

  db.update(personNames)
    .set({
      ...(input.given !== undefined && { given: input.given }),
      ...(input.surname !== undefined && { surname: input.surname }),
      ...(input.maiden !== undefined && { maiden: input.maiden }),
      ...(input.nickname !== undefined && { nickname: input.nickname }),
      ...(input.type !== undefined && {
        type: input.type as 'birth' | 'married' | 'alias',
      }),
      ...(input.isPreferred !== undefined && { isPreferred: input.isPreferred }),
      updatedAt: now(),
    })
    .where(eq(personNames.id, nameId))
    .run();

  return ok(mustGet(db.select().from(personNames).where(eq(personNames.id, nameId)).get()));
}
