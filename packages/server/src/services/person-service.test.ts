/**
 * Person service integration tests.
 *
 * Uses an in-memory SQLite database with schema applied via migrate().
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as personService from './person-service.ts';
import * as relService from './relationship-service.ts';
import { personNames, events, relationships, mediaLinks, media } from '../db/schema/index.ts';
import { uuid, now } from '../db/helpers.ts';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('personService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  // ── createPerson ─────────────────────────────────────────────────

  it('creates a person with a name', () => {
    const result = personService.createPerson(db, {
      sex: 'male',
      names: [{ given: 'Johann', surname: 'Müller' }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sex).toBe('male');
    expect(result.data.names).toHaveLength(1);
    expect(result.data.names[0].given).toBe('Johann');
    expect(result.data.names[0].surname).toBe('Müller');
    expect(result.data.names[0].isPreferred).toBe(true);
  });

  it('returns VALIDATION_ERROR when no names provided', () => {
    const result = personService.createPerson(db, { names: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a person with multiple names', () => {
    const result = personService.createPerson(db, {
      names: [
        { given: 'Anna', surname: 'Schmidt', type: 'birth', isPreferred: true },
        { given: 'Anna', surname: 'Müller', type: 'married', isPreferred: false },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.names).toHaveLength(2);
    expect(result.data.names[0].isPreferred).toBe(true);
    expect(result.data.names[1].isPreferred).toBe(false);
  });

  // ── getPersonById ────────────────────────────────────────────────

  it('fetches a person by id with names and events', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Hans', surname: 'Weber' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const result = personService.getPersonById(db, created.data.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe(created.data.id);
    expect(result.data.names).toHaveLength(1);
    expect(result.data.events).toHaveLength(0);
  });

  it('returns NOT_FOUND for missing person', () => {
    const result = personService.getPersonById(db, 'nonexistent');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── listPersons ──────────────────────────────────────────────────

  it('lists persons with pagination', () => {
    for (let i = 0; i < 5; i++) {
      personService.createPerson(db, {
        names: [{ given: `Person${i}`, surname: 'Test' }],
      });
    }

    const page1 = personService.listPersons(db, { page: 1, limit: 2 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.data.persons).toHaveLength(2);
    expect(page1.data.total).toBe(5);

    const page3 = personService.listPersons(db, { page: 3, limit: 2 });
    expect(page3.ok).toBe(true);
    if (!page3.ok) return;
    expect(page3.data.persons).toHaveLength(1);
  });

  // ── updatePerson ─────────────────────────────────────────────────

  it('updates a person', () => {
    const created = personService.createPerson(db, {
      sex: 'unknown',
      names: [{ given: 'Test', surname: 'User' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const result = personService.updatePerson(db, created.data.id, {
      sex: 'female',
      notes: 'Updated notes',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sex).toBe('female');
    expect(result.data.notes).toBe('Updated notes');
  });

  it('returns NOT_FOUND when updating missing person', () => {
    const result = personService.updatePerson(db, 'missing', { sex: 'male' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── deletePerson (soft) ──────────────────────────────────────────

  it('soft-deletes a person', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Delete', surname: 'Me' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const deleteResult = personService.deletePerson(db, created.data.id);
    expect(deleteResult.ok).toBe(true);

    // Should not be findable after deletion
    const findResult = personService.getPersonById(db, created.data.id);
    expect(findResult.ok).toBe(false);
    if (findResult.ok) return;
    expect(findResult.error.code).toBe('NOT_FOUND');

    // Should not appear in list
    const list = personService.listPersons(db);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data.total).toBe(0);
  });

  it('returns NOT_FOUND when updating a soft-deleted person', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Ghost', surname: 'Update' }],
    });
    if (!created.ok) throw new Error('setup failed');

    personService.deletePerson(db, created.data.id);

    const result = personService.updatePerson(db, created.data.id, { notes: 'should fail' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns empty page when pagination exceeds total', () => {
    personService.createPerson(db, {
      names: [{ given: 'Only', surname: 'One' }],
    });

    const result = personService.listPersons(db, { page: 100, limit: 10 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.persons).toHaveLength(0);
    expect(result.data.total).toBe(1);
  });

  it('listPersonsWithDetails returns enriched data for empty DB', () => {
    const result = personService.listPersonsWithDetails(db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.persons).toHaveLength(0);
    expect(result.data.total).toBe(0);
  });

  // ── Person Events ────────────────────────────────────────────────

  it('adds an event to a person', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Event', surname: 'Test' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const eventResult = personService.addPersonEvent(db, created.data.id, {
      type: 'birth',
      date: { type: 'exact', date: '1990-01-15' },
      description: 'Born in Munich',
    });

    expect(eventResult.ok).toBe(true);
    if (!eventResult.ok) return;
    expect(eventResult.data.type).toBe('birth');
    expect(eventResult.data.personId).toBe(created.data.id);
  });

  it('updates a person event', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Update', surname: 'Event' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const event = personService.addPersonEvent(db, created.data.id, {
      type: 'birth',
      description: 'Original',
    });
    if (!event.ok) throw new Error('setup failed');

    const updated = personService.updatePersonEvent(db, created.data.id, event.data.id, {
      description: 'Updated description',
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.description).toBe('Updated description');
  });

  it('deletes a person event (soft)', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Del', surname: 'Event' }],
    });
    if (!created.ok) throw new Error('setup failed');

    const event = personService.addPersonEvent(db, created.data.id, {
      type: 'death',
    });
    if (!event.ok) throw new Error('setup failed');

    const del = personService.deletePersonEvent(db, created.data.id, event.data.id);
    expect(del.ok).toBe(true);

    // Event should not appear in person's events
    const person = personService.getPersonById(db, created.data.id);
    if (!person.ok) throw new Error('should still find person');
    expect(person.data.events).toHaveLength(0);
  });

  it('returns NOT_FOUND for event on wrong person', () => {
    const p1 = personService.createPerson(db, { names: [{ given: 'A', surname: 'B' }] });
    const p2 = personService.createPerson(db, { names: [{ given: 'C', surname: 'D' }] });
    if (!p1.ok || !p2.ok) throw new Error('setup failed');

    const event = personService.addPersonEvent(db, p1.data.id, { type: 'birth' });
    if (!event.ok) throw new Error('setup failed');

    const result = personService.updatePersonEvent(db, p2.data.id, event.data.id, {
      description: 'hack',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── Date handling ────────────────────────────────────────────────

  it('stores and retrieves genealogy dates as JSON', () => {
    const created = personService.createPerson(db, {
      names: [{ given: 'Date', surname: 'Test' }],
    });
    if (!created.ok) throw new Error('setup failed');

    personService.addPersonEvent(db, created.data.id, {
      type: 'birth',
      date: { type: 'approximate', date: '1850' },
    });
    personService.addPersonEvent(db, created.data.id, {
      type: 'death',
      date: { type: 'range', from: '1920', to: '1925' },
    });

    const person = personService.getPersonById(db, created.data.id);
    if (!person.ok) throw new Error('should find person');
    expect(person.data.events).toHaveLength(2);

    // Dates are stored as JSON strings
    const dateStr = person.data.events[0].date ?? '';
    const birthDate = JSON.parse(dateStr);
    expect(birthDate.type).toBe('approximate');
    expect(birthDate.date).toBe('1850');
  });

  it('auto-creates birth and death events when dates provided in createPerson', () => {
    const result = personService.createPerson(db, {
      names: [{ given: 'Auto', surname: 'Events' }],
      birthDate: { type: 'exact', date: '1900-06-15' },
      deathDate: { type: 'approximate', date: '1975' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Events should be returned inline
    expect(result.data.events).toHaveLength(2);

    const birth = result.data.events.find((e) => e.type === 'birth');
    const death = result.data.events.find((e) => e.type === 'death');
    expect(birth).toBeDefined();
    expect(death).toBeDefined();

    const birthDate = JSON.parse(birth?.date ?? '');
    expect(birthDate.type).toBe('exact');
    expect(birthDate.date).toBe('1900-06-15');

    const deathDate = JSON.parse(death?.date ?? '');
    expect(deathDate.type).toBe('approximate');
    expect(deathDate.date).toBe('1975');
  });

  // ── Cascade deletion ────────────────────────────────────────────

  it('cascade-deletes relationships, events, names, and media links', () => {
    // Setup: two persons with a relationship, events, and a media link
    const personA = personService.createPerson(db, {
      names: [{ given: 'Hans', surname: 'Cascade' }],
    });
    const personB = personService.createPerson(db, {
      names: [{ given: 'Maria', surname: 'Cascade' }],
    });
    if (!personA.ok || !personB.ok) throw new Error('setup failed');

    // Create relationship
    const rel = relService.createRelationship(db, {
      personAId: personA.data.id,
      personBId: personB.data.id,
      type: 'marriage',
    });
    if (!rel.ok) throw new Error('setup failed');

    // Create event for personA
    const evt = personService.addPersonEvent(db, personA.data.id, {
      type: 'birth',
      date: { type: 'exact', date: '1920-01-01' },
    });
    if (!evt.ok) throw new Error('setup failed');

    // Create event for personB (should NOT be affected)
    const evtB = personService.addPersonEvent(db, personB.data.id, {
      type: 'birth',
      date: { type: 'exact', date: '1925-01-01' },
    });
    if (!evtB.ok) throw new Error('setup failed');

    // Create a media + media link for personA
    const timestamp = now();
    const mediaId = uuid();
    db.insert(media)
      .values({
        id: mediaId,
        type: 'image' as const,
        filename: 'test.jpg',
        originalFilename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();
    db.insert(mediaLinks)
      .values({
        id: uuid(),
        mediaId,
        linkedEntityType: 'person',
        linkedEntityId: personA.data.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .run();

    // Verify setup
    const namesBefore = db
      .select()
      .from(personNames)
      .where(eq(personNames.personId, personA.data.id))
      .all();
    expect(namesBefore).toHaveLength(1);

    // Act: delete personA
    const deleteResult = personService.deletePerson(db, personA.data.id);
    expect(deleteResult.ok).toBe(true);

    // Assert: relationship is soft-deleted
    const relAfter = db.select().from(relationships).where(eq(relationships.id, rel.data.id)).get();
    expect(relAfter?.deletedAt).not.toBeNull();

    // Assert: personA's event is soft-deleted
    const evtAfter = db.select().from(events).where(eq(events.id, evt.data.id)).get();
    expect(evtAfter?.deletedAt).not.toBeNull();

    // Assert: personA's names are hard-deleted
    const namesAfter = db
      .select()
      .from(personNames)
      .where(eq(personNames.personId, personA.data.id))
      .all();
    expect(namesAfter).toHaveLength(0);

    // Assert: personA's media links are hard-deleted
    const linksAfter = db
      .select()
      .from(mediaLinks)
      .where(eq(mediaLinks.linkedEntityId, personA.data.id))
      .all();
    expect(linksAfter).toHaveLength(0);

    // Assert: personB is unaffected
    const findB = personService.getPersonById(db, personB.data.id);
    expect(findB.ok).toBe(true);

    // Assert: personB's event is unaffected
    const evtBAfter = db.select().from(events).where(eq(events.id, evtB.data.id)).get();
    expect(evtBAfter?.deletedAt).toBeNull();
  });
});
