/**
 * Auto-relationship builder tests.
 *
 * Verifies that partner relationships are auto-created between co-parents
 * when a second parent-child link is added to a child.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as personService from './person-service';
import * as relService from './relationship-service';
import {
  maybeCreatePartnerRelationships,
  AUTO_PARTNER_QUALIFYING_TYPES,
} from './auto-relationships';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function createPerson(db: BetterSQLite3Database, given: string, surname: string) {
  const result = personService.createPerson(db, { names: [{ given, surname }] });
  if (!result.ok) throw new Error(`Failed to create person: ${given} ${surname}`);
  return result.data;
}

function addParent(
  db: BetterSQLite3Database,
  parentId: string,
  childId: string,
  type: string = 'biological_parent',
) {
  const result = relService.createRelationship(db, {
    personAId: parentId,
    personBId: childId,
    type,
  });
  if (!result.ok) throw new Error(`Failed to add parent: ${result.error.message}`);
  return result.data;
}

describe('maybeCreatePartnerRelationships', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('auto-creates marriage when second biological parent is added', () => {
    const father = createPerson(db, 'Hans', 'Müller');
    const mother = createPerson(db, 'Maria', 'Müller');
    const child = createPerson(db, 'Karl', 'Müller');

    // First parent — no auto-creation
    const rel1 = addParent(db, father.id, child.id);
    const auto1 = maybeCreatePartnerRelationships(db, rel1);
    expect(auto1).toHaveLength(0);

    // Second parent — should auto-create marriage
    const rel2 = addParent(db, mother.id, child.id);
    const auto2 = maybeCreatePartnerRelationships(db, rel2);

    expect(auto2).toHaveLength(1);
    expect(auto2[0].type).toBe('marriage');
    // Verify the correct pair
    const ids = [auto2[0].personAId, auto2[0].personBId].sort();
    const expected = [father.id, mother.id].sort();
    expect(ids).toEqual(expected);
  });

  it('does NOT auto-create if partner relationship already exists', () => {
    const father = createPerson(db, 'Hans', 'Dup');
    const mother = createPerson(db, 'Maria', 'Dup');
    const child = createPerson(db, 'Karl', 'Dup');

    // Manually create marriage first
    relService.createRelationship(db, {
      personAId: father.id,
      personBId: mother.id,
      type: 'marriage',
    });

    addParent(db, father.id, child.id);
    const rel2 = addParent(db, mother.id, child.id);
    const auto = maybeCreatePartnerRelationships(db, rel2);

    expect(auto).toHaveLength(0);
  });

  it('does NOT trigger for godparent', () => {
    const parent = createPerson(db, 'Hans', 'God');
    const godparent = createPerson(db, 'Peter', 'God');
    const child = createPerson(db, 'Karl', 'God');

    addParent(db, parent.id, child.id);

    const godRel = relService.createRelationship(db, {
      personAId: godparent.id,
      personBId: child.id,
      type: 'godparent',
    });
    if (!godRel.ok) throw new Error('setup');

    const auto = maybeCreatePartnerRelationships(db, godRel.data);
    expect(auto).toHaveLength(0);
  });

  it('does NOT trigger for guardian', () => {
    const parent = createPerson(db, 'Hans', 'Guard');
    const guardian = createPerson(db, 'Peter', 'Guard');
    const child = createPerson(db, 'Karl', 'Guard');

    addParent(db, parent.id, child.id);

    const guardRel = relService.createRelationship(db, {
      personAId: guardian.id,
      personBId: child.id,
      type: 'guardian',
    });
    if (!guardRel.ok) throw new Error('setup');

    const auto = maybeCreatePartnerRelationships(db, guardRel.data);
    expect(auto).toHaveLength(0);
  });

  it('triggers for step_parent', () => {
    const parent = createPerson(db, 'Hans', 'Step');
    const stepParent = createPerson(db, 'Eva', 'Step');
    const child = createPerson(db, 'Karl', 'Step');

    addParent(db, parent.id, child.id);
    const rel2 = addParent(db, stepParent.id, child.id, 'step_parent');
    const auto = maybeCreatePartnerRelationships(db, rel2);

    expect(auto).toHaveLength(1);
    expect(auto[0].type).toBe('marriage');
  });

  it('triggers for foster_parent', () => {
    const parent = createPerson(db, 'Hans', 'Foster');
    const fosterParent = createPerson(db, 'Eva', 'Foster');
    const child = createPerson(db, 'Karl', 'Foster');

    addParent(db, parent.id, child.id);
    const rel2 = addParent(db, fosterParent.id, child.id, 'foster_parent');
    const auto = maybeCreatePartnerRelationships(db, rel2);

    expect(auto).toHaveLength(1);
    expect(auto[0].type).toBe('marriage');
  });

  it('triggers for adoptive_parent', () => {
    const parent = createPerson(db, 'Hans', 'Adopt');
    const adoptiveParent = createPerson(db, 'Eva', 'Adopt');
    const child = createPerson(db, 'Karl', 'Adopt');

    addParent(db, parent.id, child.id);
    const rel2 = addParent(db, adoptiveParent.id, child.id, 'adoptive_parent');
    const auto = maybeCreatePartnerRelationships(db, rel2);

    expect(auto).toHaveLength(1);
    expect(auto[0].type).toBe('marriage');
  });

  it('handles 3+ parents (creates partner links for each pair)', () => {
    const father = createPerson(db, 'Hans', 'Multi');
    const mother = createPerson(db, 'Maria', 'Multi');
    const stepMother = createPerson(db, 'Eva', 'Multi');
    const child = createPerson(db, 'Karl', 'Multi');

    // Add first parent — no auto-creation
    const rel1 = addParent(db, father.id, child.id);
    expect(maybeCreatePartnerRelationships(db, rel1)).toHaveLength(0);

    // Add second parent — 1 auto-creation (father ↔ mother)
    const rel2 = addParent(db, mother.id, child.id);
    const auto2 = maybeCreatePartnerRelationships(db, rel2);
    expect(auto2).toHaveLength(1);

    // Add third parent — 2 auto-creations (stepMother ↔ father, stepMother ↔ mother)
    const rel3 = addParent(db, stepMother.id, child.id, 'step_parent');
    const auto3 = maybeCreatePartnerRelationships(db, rel3);
    expect(auto3).toHaveLength(2);
  });

  it('only triggers for first parent with no existing co-parent returns empty', () => {
    const parent = createPerson(db, 'Solo', 'Parent');
    const child = createPerson(db, 'Only', 'Child');

    const rel = addParent(db, parent.id, child.id);
    const auto = maybeCreatePartnerRelationships(db, rel);

    expect(auto).toHaveLength(0);
  });

  it('exports the qualifying types constant', () => {
    expect(AUTO_PARTNER_QUALIFYING_TYPES).toContain('biological_parent');
    expect(AUTO_PARTNER_QUALIFYING_TYPES).toContain('adoptive_parent');
    expect(AUTO_PARTNER_QUALIFYING_TYPES).toContain('step_parent');
    expect(AUTO_PARTNER_QUALIFYING_TYPES).toContain('foster_parent');
    expect(AUTO_PARTNER_QUALIFYING_TYPES).not.toContain('guardian');
    expect(AUTO_PARTNER_QUALIFYING_TYPES).not.toContain('godparent');
  });
});
