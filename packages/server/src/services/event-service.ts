/**
 * Event service — business logic for person event CRUD.
 *
 * Extracted from person-service.ts to keep each service focused
 * and within reasonable line-count thresholds.
 *
 * All methods return Result<T> — no thrown exceptions.
 */

import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { persons, events } from '../db/schema/index';
import { mustGet } from '../db/db-helpers';
import { now, uuid } from '../db/helpers';

// ── Types ────────────────────────────────────────────────────────────

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

export interface EventRow {
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

// ── Service methods ──────────────────────────────────────────────────

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
