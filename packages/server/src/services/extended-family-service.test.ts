/**
 * Extended family derivation tests.
 *
 * Verifies that the graph traversal correctly derives extended relationships
 * like grandparents, uncles, cousins, in-laws, without materializing them
 * in the database.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as personService from './person-service';
import * as relService from './relationship-service';
import { getExtendedFamily } from './extended-family-service';

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
  return result.data.id;
}

function linkParentChild(
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
}

function linkPartners(
  db: BetterSQLite3Database,
  personAId: string,
  personBId: string,
  type: string = 'marriage',
) {
  const result = relService.createRelationship(db, {
    personAId,
    personBId,
    type,
  });
  if (!result.ok) throw new Error(`Failed to add partner: ${result.error.message}`);
}

describe('getExtendedFamily', () => {
  let db: BetterSQLite3Database;

  // The target person
  let P: string;
  let brother: string;
  let father: string;
  let mother: string;
  let gf: string; // Grandfather (father's side)
  let gm: string; // Grandmother (father's side)
  let uncle: string; // Father's brother
  let cousin: string; // Uncle's son
  let aunt: string; // Mother's sister
  let nephew: string; // Brother's son
  let wife: string; // P's wife
  let brotherInLaw: string; // Wife's brother
  let motherInLaw: string; // Wife's mother
  let son: string; // P's child
  let daughterInLaw: string; // Son's wife
  let coParentInLaw: string; // Daughter-in-law's father

  beforeEach(() => {
    db = createTestDb();

    // 1. Create everyone
    P = createPerson(db, 'Target', 'P');
    brother = createPerson(db, 'Brother', 'B');
    father = createPerson(db, 'Father', 'F');
    mother = createPerson(db, 'Mother', 'M');
    gf = createPerson(db, 'Grandfather', 'GF');
    gm = createPerson(db, 'Grandmother', 'GM');
    uncle = createPerson(db, 'Uncle', 'U');
    cousin = createPerson(db, 'Cousin', 'C');
    aunt = createPerson(db, 'Aunt', 'A');
    nephew = createPerson(db, 'Nephew', 'N');
    wife = createPerson(db, 'Wife', 'W');
    brotherInLaw = createPerson(db, 'BrotherInLaw', 'BIL');
    motherInLaw = createPerson(db, 'MotherInLaw', 'MIL');
    son = createPerson(db, 'Son', 'S');
    daughterInLaw = createPerson(db, 'DaughterInLaw', 'DIL');
    coParentInLaw = createPerson(db, 'CoParentInLaw', 'CPIL');

    // 2. Build the graph

    // P's immediate family
    linkParentChild(db, father, P);
    linkParentChild(db, mother, P);
    linkParentChild(db, father, brother);
    linkParentChild(db, mother, brother);

    // P's grandparents (father's side)
    linkParentChild(db, gf, father);
    linkParentChild(db, gm, father);

    // Uncle (father's brother) and Aunt (mother's sister)
    linkParentChild(db, gf, uncle);
    linkParentChild(db, gm, uncle);
    // Let's just create a generic parent for mother to link aunt
    const mGrandpa = createPerson(db, 'MGrandpa', 'MGP');
    linkParentChild(db, mGrandpa, mother);
    linkParentChild(db, mGrandpa, aunt);

    // Cousin (uncle's child)
    linkParentChild(db, uncle, cousin);

    // Nephew (brother's child)
    linkParentChild(db, brother, nephew);

    // P's wife and in-laws
    linkPartners(db, P, wife);
    linkParentChild(db, motherInLaw, wife);
    linkParentChild(db, motherInLaw, brotherInLaw); // sibling of wife

    // P's son and children-in-law
    linkParentChild(db, P, son);
    linkParentChild(db, wife, son);
    linkPartners(db, son, daughterInLaw);

    // Co-parent-in-law (DIL's father)
    linkParentChild(db, coParentInLaw, daughterInLaw);
  });

  it('computes grandparents correctly', () => {
    const res = getExtendedFamily(db, P);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const ids = res.data.grandparents.map((p) => p.person.id).sort();
    // We expect gf, gm, and mGrandpa
    const expected = [gf, gm].sort();
    // wait, we only query the id so we can compare
    expect(ids).toEqual(expect.arrayContaining(expected));
    // Should have 3 grandparents total
    expect(ids.length).toBe(3);
  });

  it('computes uncles and aunts correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.unclesAunts.map((p) => p.person.id).sort();
    expect(ids).toEqual([aunt, uncle].sort());
  });

  it('computes cousins correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.cousins.map((p) => p.person.id);
    expect(ids).toEqual([cousin]);
  });

  it('computes nephews and nieces correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.nephewsNieces.map((p) => p.person.id);
    expect(ids).toEqual([nephew]);
  });

  it('computes siblings-in-law correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.siblingsInLaw.map((p) => p.person.id);
    // P's wife's brother
    expect(ids).toEqual([brotherInLaw]);
  });

  it('computes parents-in-law correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.parentsInLaw.map((p) => p.person.id);
    expect(ids).toEqual([motherInLaw]);
  });

  it('computes children-in-law correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.childrenInLaw.map((p) => p.person.id);
    expect(ids).toEqual([daughterInLaw]);
  });

  it('computes co-parents-in-law correctly', () => {
    const res = getExtendedFamily(db, P);
    if (!res.ok) throw res.error;

    const ids = res.data.coParentsInLaw.map((p) => p.person.id);
    expect(ids).toEqual([coParentInLaw]);
  });

  it('excludes godparents from cousin derivation', () => {
    const parent = createPerson(db, 'p', 'p');
    const child1 = createPerson(db, 'c1', 'c1'); // target
    const child2 = createPerson(db, 'c2', 'c2'); // brother
    const godparent = createPerson(db, 'gp', 'gp');
    const godCousin = createPerson(db, 'gc', 'gc'); // godparent's child

    linkParentChild(db, parent, child1);
    linkParentChild(db, parent, child2);
    // add a godparent to the brother
    linkParentChild(db, godparent, child2, 'godparent');
    linkParentChild(db, godparent, godCousin);

    const res = getExtendedFamily(db, child1);
    if (!res.ok) throw res.error;

    // godCousin should NOT be a cousin
    expect(res.data.cousins.map((p) => p.person.id)).not.toContain(godCousin);
  });
});
