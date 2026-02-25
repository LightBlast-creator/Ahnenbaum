/**
 * Relationship service integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as relService from './relationship-service';
import * as personService from './person-service';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function createTestPerson(db: BetterSQLite3Database, given: string, surname: string) {
  const result = personService.createPerson(db, { names: [{ given, surname }] });
  if (!result.ok) throw new Error(`Failed to create test person: ${given} ${surname}`);
  return result.data;
}

describe('relationshipService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a relationship between two persons', () => {
    const father = createTestPerson(db, 'Hans', 'Müller');
    const son = createTestPerson(db, 'Karl', 'Müller');

    const result = relService.createRelationship(db, {
      personAId: father.id,
      personBId: son.id,
      type: 'biological_parent',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.type).toBe('biological_parent');
    expect(result.data.personAId).toBe(father.id);
    expect(result.data.personBId).toBe(son.id);
  });

  it('rejects self-relationships', () => {
    const person = createTestPerson(db, 'Self', 'Ref');
    const result = relService.createRelationship(db, {
      personAId: person.id,
      personBId: person.id,
      type: 'biological_parent',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate relationships', () => {
    const a = createTestPerson(db, 'A', 'Test');
    const b = createTestPerson(db, 'B', 'Test');

    relService.createRelationship(db, { personAId: a.id, personBId: b.id, type: 'marriage' });

    // Same pair, same type — should be rejected
    const result = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'marriage',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });

  it('rejects duplicate regardless of direction', () => {
    const a = createTestPerson(db, 'A', 'Dir');
    const b = createTestPerson(db, 'B', 'Dir');

    relService.createRelationship(db, { personAId: a.id, personBId: b.id, type: 'marriage' });

    // Reversed direction, same type — still a duplicate
    const result = relService.createRelationship(db, {
      personAId: b.id,
      personBId: a.id,
      type: 'marriage',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CONFLICT');
  });

  it('allows different relationship types between same persons', () => {
    const a = createTestPerson(db, 'A', 'Multi');
    const b = createTestPerson(db, 'B', 'Multi');

    const r1 = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'marriage',
    });
    const r2 = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'godparent',
    });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('gets relationships for a person grouped by type', () => {
    const father = createTestPerson(db, 'Hans', 'G');
    const mother = createTestPerson(db, 'Maria', 'G');
    const child = createTestPerson(db, 'Karl', 'G');

    relService.createRelationship(db, {
      personAId: father.id,
      personBId: mother.id,
      type: 'marriage',
    });
    relService.createRelationship(db, {
      personAId: father.id,
      personBId: child.id,
      type: 'biological_parent',
    });
    relService.createRelationship(db, {
      personAId: mother.id,
      personBId: child.id,
      type: 'biological_parent',
    });

    const result = relService.getRelationshipsForPerson(db, child.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data['biological_parent']).toHaveLength(2);
    expect(result.data['marriage']).toBeUndefined(); // child is not part of the marriage
  });

  it('supports same-sex marriage relationships', () => {
    const a = createTestPerson(db, 'Alex', 'Same');
    const b = createTestPerson(db, 'Jordan', 'Same');

    // Update both to same sex
    personService.updatePerson(db, a.id, { sex: 'male' });
    personService.updatePerson(db, b.id, { sex: 'male' });

    const result = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'civil_partnership',
    });
    expect(result.ok).toBe(true);
  });

  it('stores relationship dates as JSON', () => {
    const a = createTestPerson(db, 'Date', 'A');
    const b = createTestPerson(db, 'Date', 'B');

    const result = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'marriage',
      startDate: { type: 'exact', date: '1960-06-15' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = JSON.parse(result.data.startDate ?? '');
    expect(parsed.type).toBe('exact');
    expect(parsed.date).toBe('1960-06-15');
  });

  it('soft-deletes a relationship', () => {
    const a = createTestPerson(db, 'Del', 'A');
    const b = createTestPerson(db, 'Del', 'B');

    const created = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'cohabitation',
    });
    if (!created.ok) throw new Error('setup');

    const del = relService.deleteRelationship(db, created.data.id);
    expect(del.ok).toBe(true);

    const find = relService.getRelationshipById(db, created.data.id);
    expect(find.ok).toBe(false);
  });

  it('updates a relationship type', () => {
    const a = createTestPerson(db, 'Up', 'A');
    const b = createTestPerson(db, 'Up', 'B');

    const created = relService.createRelationship(db, {
      personAId: a.id,
      personBId: b.id,
      type: 'engagement',
    });
    if (!created.ok) throw new Error('setup');

    const updated = relService.updateRelationship(db, created.data.id, { type: 'marriage' });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.type).toBe('marriage');
  });
});
