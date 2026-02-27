/**
 * Person service — business logic for person CRUD and events.
 *
 * All methods return Result<T> — no thrown exceptions.
 * Database operations use Drizzle ORM against the schema.
 */

import { eq, isNull, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { persons, personNames, events, relationships } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';

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
}

/**
 * List persons with their names and events joined inline.
 * Used by the frontend persons list page.
 */
export function listPersonsWithDetails(
  db: BetterSQLite3Database,
  opts: { page?: number; limit?: number } = {},
): Result<{ persons: PersonWithDetailsRow[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const whereClause = isNull(persons.deletedAt);
  const total = countRows(db, persons, whereClause);

  const rows = db.select().from(persons).where(whereClause).limit(limit).offset(offset).all();

  const enriched: PersonWithDetailsRow[] = rows.map((person) => {
    const names = db.select().from(personNames).where(eq(personNames.personId, person.id)).all();
    const personEvents = db
      .select()
      .from(events)
      .where(eq(events.personId, person.id))
      .all()
      .filter((e) => !e.deletedAt);

    return {
      id: person.id,
      sex: person.sex,
      notes: person.notes,
      privacy: person.privacy,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      names,
      events: personEvents,
    };
  });

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

// ── Ancestor tree ───────────────────────────────────────────────────

export interface TreeNodeResponse {
  person: PersonWithDetailsRow;
  parents: TreeNodeResponse[];
}

const PARENT_TYPES = ['biological_parent', 'adoptive_parent', 'step_parent', 'foster_parent'];

// ── Full Family Tree ─────────────────────────────────────────────────

/**
 * Shape returned by getFullFamilyTree — a flat graph of all persons + edges.
 * Used by the full-overview tree page.
 */
export interface FullFamilyTreeResponse {
  persons: PersonWithDetailsRow[];
  relationships: { id: string; personAId: string; personBId: string; type: string }[];
}

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

  const enrichedPersons: PersonWithDetailsRow[] = allPersons.map((person) => ({
    id: person.id,
    sex: person.sex,
    notes: person.notes,
    privacy: person.privacy,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    names: namesByPerson.get(person.id) ?? [],
    events: eventsByPerson.get(person.id) ?? [],
  }));

  return ok({ persons: enrichedPersons, relationships: allRels });
}

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
      .filter((r) => PARENT_TYPES.includes(r.type));

    const parents = parentRels
      .map((r) => buildNode(r.personAId, depth - 1))
      .filter((n): n is TreeNodeResponse => n !== null);

    return { person: personWithDetails, parents };
  }

  const tree = buildNode(rootId, maxGenerations);
  return ok(tree);
}
