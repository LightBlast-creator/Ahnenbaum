/**
 * Person service — business logic for person CRUD and events.
 *
 * All methods return Result<T> — no thrown exceptions.
 * Database operations use Drizzle ORM against the schema.
 */

import { eq, isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { persons, personNames, events } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';

// ── Types ────────────────────────────────────────────────────────────

export interface CreatePersonInput {
  sex?: string;
  notes?: string;
  privacy?: string;
  names: CreatePersonNameInput[];
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

export interface CreateEventInput {
  type: string;
  date?: GenealogyDate;
  placeId?: string;
  description?: string;
  notes?: string;
  citationId?: string;
}

export interface UpdateEventInput {
  type?: string;
  date?: GenealogyDate;
  placeId?: string;
  description?: string;
  notes?: string;
  citationId?: string;
}

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

interface EventRow {
  id: string;
  type: string;
  date: string | null;
  placeId: string | null;
  personId: string | null;
  relationshipId: string | null;
  description: string | null;
  notes: string | null;
  citationId: string | null;
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

// ── Service methods ──────────────────────────────────────────────────

export function createPerson(
  db: BetterSQLite3Database,
  input: CreatePersonInput,
): Result<PersonRow & { names: PersonNameRow[] }> {
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

  const person = mustGet(db.select().from(persons).where(eq(persons.id, personId)).get());
  return ok({ ...person, names: nameRows });
}

export function getPersonById(
  db: BetterSQLite3Database,
  id: string,
): Result<PersonRow & { names: PersonNameRow[]; events: EventRow[] }> {
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

  return ok({ ...person, names, events: personEvents });
}

export function listPersons(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number } = {},
): Result<{ persons: PersonRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

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

  db.update(persons).set({ deletedAt: now(), updatedAt: now() }).where(eq(persons.id, id)).run();

  return ok(undefined);
}

// ── Person Events ────────────────────────────────────────────────────

export function addPersonEvent(
  db: BetterSQLite3Database,
  personId: string,
  input: CreateEventInput,
): Result<EventRow> {
  const person = db.select().from(persons).where(eq(persons.id, personId)).get();
  if (!person || person.deletedAt) {
    return err('NOT_FOUND', `Person with id '${personId}' not found`);
  }

  const timestamp = now();
  const eventId = uuid();
  const eventType = input.type as EventRow['type'];

  db.insert(events)
    .values({
      id: eventId,
      type: eventType as typeof events.$inferInsert.type,
      date: input.date ? JSON.stringify(input.date) : null,
      placeId: input.placeId ?? null,
      personId,
      relationshipId: null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      citationId: input.citationId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(events).where(eq(events.id, eventId)).get()));
}

export function updatePersonEvent(
  db: BetterSQLite3Database,
  personId: string,
  eventId: string,
  input: UpdateEventInput,
): Result<EventRow> {
  const event = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!event || event.deletedAt || event.personId !== personId) {
    return err('NOT_FOUND', `Event with id '${eventId}' not found for person '${personId}'`);
  }

  db.update(events)
    .set({
      ...(input.type !== undefined && { type: input.type as typeof events.$inferInsert.type }),
      ...(input.date !== undefined && { date: JSON.stringify(input.date) }),
      ...(input.placeId !== undefined && { placeId: input.placeId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.citationId !== undefined && { citationId: input.citationId }),
      updatedAt: now(),
    })
    .where(eq(events.id, eventId))
    .run();

  return ok(mustGet(db.select().from(events).where(eq(events.id, eventId)).get()));
}

export function deletePersonEvent(
  db: BetterSQLite3Database,
  personId: string,
  eventId: string,
): Result<void> {
  const event = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!event || event.deletedAt || event.personId !== personId) {
    return err('NOT_FOUND', `Event with id '${eventId}' not found for person '${personId}'`);
  }

  db.update(events).set({ deletedAt: now(), updatedAt: now() }).where(eq(events.id, eventId)).run();

  return ok(undefined);
}
