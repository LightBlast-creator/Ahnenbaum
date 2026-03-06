/**
 * Database seed script — populates a realistic 4-generation German family.
 *
 * Idempotent: clears all data then re-inserts.
 * Designed so both developers work with identical test data.
 *
 * Family tree:
 *
 *   Generation 1 (great-grandparents):
 *     Friedrich Müller ─── m. ─── Wilhelmine Bauer
 *     Otto Schneider ──── m. ─── Hedwig Fischer
 *
 *   Generation 2 (grandparents):
 *     Heinrich Müller (son of Friedrich & Wilhelmine) ─── m. ─── Gertrud Schneider (daughter of Otto & Hedwig)
 *     Karl Weber ────────── m. ─── Elise Wagner
 *
 *   Generation 3 (parents):
 *     Johann Müller (son of Heinrich & Gertrud) ─── m. ─── Anna Weber (daughter of Karl & Elise)
 *     Ludwig Schmidt ─── m. ─── Marie Braun
 *
 *   Generation 4 (children):
 *     Thomas Müller (son of Johann & Anna)
 *     Sophia Müller (daughter of Johann & Anna) ─── m. ─── Martin Schmidt (son of Ludwig & Marie)
 *     Emma Müller (daughter of Johann & Anna)
 */

import { type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  persons,
  personNames,
  places,
  relationships,
  events,
  sources,
  citations,
  media,
  mediaLinks,
} from './schema/index.ts';
import { countRows } from './db-helpers.ts';

export interface SeedResult {
  persons: number;
  relationships: number;
  events: number;
  places: number;
  sources: number;
  citations: number;
  media: number;
}

function now(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

// ── Clear ────────────────────────────────────────────────────────────

function clearAll(db: BetterSQLite3Database): void {
  // Order matters due to foreign keys
  db.delete(mediaLinks).run();
  db.delete(media).run();
  db.delete(events).run();
  db.delete(citations).run();
  db.delete(sources).run();
  db.delete(relationships).run();
  db.delete(personNames).run();
  db.delete(persons).run();
  db.delete(places).run();
}

// ── Seed helpers ─────────────────────────────────────────────────────

function insertPerson(
  db: BetterSQLite3Database,
  sex: 'male' | 'female',
  given: string,
  surname: string,
) {
  const ts = now();
  const personId = uuid();
  db.insert(persons).values({ id: personId, sex, createdAt: ts, updatedAt: ts }).run();
  db.insert(personNames)
    .values({
      id: uuid(),
      personId,
      given,
      surname,
      type: 'birth',
      isPreferred: true,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return personId;
}

function insertEvent(
  db: BetterSQLite3Database,
  opts: {
    type: string;
    personId?: string;
    relationshipId?: string;
    placeId?: string;
    date?: string;
    endDate?: string;
    description?: string;
    citationId?: string;
  },
) {
  const ts = now();
  db.insert(events)
    .values({
      id: uuid(),
      type: opts.type as typeof events.$inferInsert.type,
      personId: opts.personId ?? null,
      relationshipId: opts.relationshipId ?? null,
      placeId: opts.placeId ?? null,
      date: opts.date ?? null,
      endDate: opts.endDate ?? null,
      description: opts.description ?? null,
      citationId: opts.citationId ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
}

function insertRelationship(
  db: BetterSQLite3Database,
  personAId: string,
  personBId: string,
  type: string,
  startDate?: string,
) {
  const ts = now();
  const id = uuid();
  db.insert(relationships)
    .values({
      id,
      personAId,
      personBId,
      type: type as typeof relationships.$inferInsert.type,
      startDate: startDate ?? null,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  return id;
}

// ── Main ─────────────────────────────────────────────────────────────

export async function seed(db: BetterSQLite3Database): Promise<SeedResult> {
  const start = performance.now();
  console.log('\n🌱 Seeding database…\n');

  console.log('── Clear ──');
  clearAll(db);
  console.log('  ✓ All tables cleared\n');

  console.log('── Places ──');
  const ts = now();
  const germany = uuid();
  db.insert(places).values({ id: germany, name: 'Germany', createdAt: ts, updatedAt: ts }).run();
  const bavaria = uuid();
  db.insert(places)
    .values({ id: bavaria, name: 'Bavaria', parentId: germany, createdAt: ts, updatedAt: ts })
    .run();
  const munich = uuid();
  db.insert(places)
    .values({ id: munich, name: 'Munich', parentId: bavaria, createdAt: ts, updatedAt: ts })
    .run();
  const augsburg = uuid();
  db.insert(places)
    .values({ id: augsburg, name: 'Augsburg', parentId: bavaria, createdAt: ts, updatedAt: ts })
    .run();
  const nuremberg = uuid();
  db.insert(places)
    .values({ id: nuremberg, name: 'Nuremberg', parentId: bavaria, createdAt: ts, updatedAt: ts })
    .run();
  const berlin = uuid();
  db.insert(places)
    .values({ id: berlin, name: 'Berlin', parentId: germany, createdAt: ts, updatedAt: ts })
    .run();
  console.log('  ✓ 6 places\n');

  console.log('── Sources ──');
  const parishId = uuid();
  db.insert(sources)
    .values({
      id: parishId,
      title: 'Kirchenbuch St. Peter, München',
      author: 'Pfarramt St. Peter',
      repositoryName: 'Archiv des Erzbistums München',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  const censusId = uuid();
  db.insert(sources)
    .values({
      id: censusId,
      title: 'Volkszählung Bayern 1900',
      publisher: 'Königlich Bayerisches Statistisches Bureau',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  const civilId = uuid();
  db.insert(sources)
    .values({
      id: civilId,
      title: 'Standesamt München — Heiratsregister',
      repositoryName: 'Stadtarchiv München',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  console.log('  ✓ 3 sources\n');

  console.log('── Citations ──');
  const cite1 = uuid();
  db.insert(citations)
    .values({
      id: cite1,
      sourceId: parishId,
      detail: 'Taufeintrag Friedrich Müller',
      page: '23',
      confidence: 'primary',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  const cite2 = uuid();
  db.insert(citations)
    .values({
      id: cite2,
      sourceId: civilId,
      detail: 'Heiratsurkunde Heinrich Müller & Gertrud Schneider',
      page: '112',
      confidence: 'primary',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  const cite3 = uuid();
  db.insert(citations)
    .values({
      id: cite3,
      sourceId: censusId,
      detail: 'Haushaltsliste Müller, Augsburg',
      confidence: 'secondary',
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  console.log('  ✓ 3 citations\n');

  console.log('── Persons ──');
  // Gen 1
  const friedrich = insertPerson(db, 'male', 'Friedrich', 'Müller');
  const wilhelmine = insertPerson(db, 'female', 'Wilhelmine', 'Bauer');
  const otto = insertPerson(db, 'male', 'Otto', 'Schneider');
  const hedwig = insertPerson(db, 'female', 'Hedwig', 'Fischer');

  // Gen 2
  const heinrich = insertPerson(db, 'male', 'Heinrich', 'Müller');
  const gertrud = insertPerson(db, 'female', 'Gertrud', 'Schneider');
  const karl = insertPerson(db, 'male', 'Karl', 'Weber');
  const elise = insertPerson(db, 'female', 'Elise', 'Wagner');

  // Gen 3
  const johann = insertPerson(db, 'male', 'Johann', 'Müller');
  const anna = insertPerson(db, 'female', 'Anna', 'Weber');
  const ludwig = insertPerson(db, 'male', 'Ludwig', 'Schmidt');
  const marie = insertPerson(db, 'female', 'Marie', 'Braun');

  // Gen 4
  const thomas = insertPerson(db, 'male', 'Thomas', 'Müller');
  const sophia = insertPerson(db, 'female', 'Sophia', 'Müller');
  const martin = insertPerson(db, 'male', 'Martin', 'Schmidt');
  const emma = insertPerson(db, 'female', 'Emma', 'Müller');

  // Add married name for Sophia
  db.insert(personNames)
    .values({
      id: uuid(),
      personId: sophia,
      given: 'Sophia',
      surname: 'Schmidt',
      type: 'married',
      isPreferred: false,
      createdAt: ts,
      updatedAt: ts,
    })
    .run();
  console.log('  ✓ 16 persons\n');

  console.log('── Relationships ──');
  // Gen 1 marriages
  insertRelationship(
    db,
    friedrich,
    wilhelmine,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1860-04-12' }),
  );
  insertRelationship(
    db,
    otto,
    hedwig,
    'marriage',
    JSON.stringify({ type: 'approximate', date: '1858' }),
  );

  // Gen 1 → Gen 2 parent-child
  insertRelationship(db, friedrich, heinrich, 'biological_parent');
  insertRelationship(db, wilhelmine, heinrich, 'biological_parent');
  insertRelationship(db, otto, gertrud, 'biological_parent');
  insertRelationship(db, hedwig, gertrud, 'biological_parent');

  // Gen 2 marriages
  const heinGertMarr = insertRelationship(
    db,
    heinrich,
    gertrud,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1895-06-20' }),
  );
  insertRelationship(
    db,
    karl,
    elise,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1892-09-14' }),
  );

  // Gen 2 → Gen 3
  insertRelationship(db, heinrich, johann, 'biological_parent');
  insertRelationship(db, gertrud, johann, 'biological_parent');
  insertRelationship(db, karl, anna, 'biological_parent');
  insertRelationship(db, elise, anna, 'biological_parent');

  // Gen 3 marriages
  insertRelationship(
    db,
    johann,
    anna,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1925-05-10' }),
  );
  insertRelationship(
    db,
    ludwig,
    marie,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1928-11-03' }),
  );

  // Gen 3 → Gen 4
  insertRelationship(db, johann, thomas, 'biological_parent');
  insertRelationship(db, anna, thomas, 'biological_parent');
  insertRelationship(db, johann, sophia, 'biological_parent');
  insertRelationship(db, anna, sophia, 'biological_parent');
  insertRelationship(db, johann, emma, 'biological_parent');
  insertRelationship(db, anna, emma, 'biological_parent');
  insertRelationship(db, ludwig, martin, 'biological_parent');
  insertRelationship(db, marie, martin, 'biological_parent');

  // Gen 4 marriage
  insertRelationship(
    db,
    martin,
    sophia,
    'marriage',
    JSON.stringify({ type: 'exact', date: '1960-08-22' }),
  );

  // Godparent
  insertRelationship(db, otto, johann, 'godparent');
  console.log('  ✓ 24 relationships\n');

  console.log('── Events ──');
  // Gen 1 birth/death
  insertEvent(db, {
    type: 'birth',
    personId: friedrich,
    placeId: augsburg,
    date: JSON.stringify({ type: 'exact', date: '1835-03-12' }),
    citationId: cite1,
  });
  insertEvent(db, {
    type: 'death',
    personId: friedrich,
    placeId: augsburg,
    date: JSON.stringify({ type: 'exact', date: '1910-11-28' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: wilhelmine,
    placeId: munich,
    date: JSON.stringify({ type: 'approximate', date: '1840' }),
  });
  insertEvent(db, {
    type: 'death',
    personId: wilhelmine,
    date: JSON.stringify({ type: 'before', date: '1920' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: otto,
    placeId: nuremberg,
    date: JSON.stringify({ type: 'exact', date: '1832-07-04' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: hedwig,
    placeId: nuremberg,
    date: JSON.stringify({ type: 'approximate', date: '1836' }),
  });

  // Gen 2
  insertEvent(db, {
    type: 'birth',
    personId: heinrich,
    placeId: augsburg,
    date: JSON.stringify({ type: 'exact', date: '1865-01-22' }),
  });
  insertEvent(db, {
    type: 'death',
    personId: heinrich,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1940-03-15' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: gertrud,
    placeId: nuremberg,
    date: JSON.stringify({ type: 'exact', date: '1870-05-08' }),
  });
  insertEvent(db, { type: 'baptism', personId: gertrud, placeId: nuremberg, citationId: cite1 });
  insertEvent(db, {
    type: 'marriage',
    relationshipId: heinGertMarr,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1895-06-20' }),
    citationId: cite2,
  });

  // Gen 3
  insertEvent(db, {
    type: 'birth',
    personId: johann,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1898-09-30' }),
  });
  insertEvent(db, {
    type: 'occupation',
    personId: johann,
    description: 'Bäckermeister',
    placeId: munich,
  });
  insertEvent(db, {
    type: 'birth',
    personId: anna,
    placeId: augsburg,
    date: JSON.stringify({ type: 'exact', date: '1901-12-01' }),
  });
  insertEvent(db, {
    type: 'residence',
    personId: johann,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1920' }),
    endDate: JSON.stringify({ type: 'exact', date: '1970' }),
    citationId: cite3,
  });
  insertEvent(db, {
    type: 'death',
    personId: johann,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1972-04-18' }),
  });

  // Gen 4
  insertEvent(db, {
    type: 'birth',
    personId: thomas,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1926-02-14' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: sophia,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1930-07-19' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: martin,
    placeId: berlin,
    date: JSON.stringify({ type: 'exact', date: '1929-10-05' }),
  });
  insertEvent(db, {
    type: 'birth',
    personId: emma,
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1934-11-22' }),
  });
  insertEvent(db, {
    type: 'education',
    personId: thomas,
    description: 'Studium der Medizin, LMU München',
    placeId: munich,
    date: JSON.stringify({ type: 'exact', date: '1946' }),
    endDate: JSON.stringify({ type: 'exact', date: '1952' }),
  });
  insertEvent(db, {
    type: 'military_service',
    personId: thomas,
    description: 'Wehrmacht 1944-1945',
    date: JSON.stringify({ type: 'exact', date: '1944' }),
    endDate: JSON.stringify({ type: 'exact', date: '1945' }),
  });
  console.log('  ✓ 22 events\n');

  const elapsed = ((performance.now() - start) / 1000).toFixed(2);

  const result: SeedResult = {
    persons: countRows(db, persons),
    relationships: countRows(db, relationships),
    events: countRows(db, events),
    places: countRows(db, places),
    sources: countRows(db, sources),
    citations: countRows(db, citations),
    media: countRows(db, media),
  };

  const total = Object.values(result).reduce((a, b) => a + b, 0);
  console.log(`✅ Seed complete — ${total} rows inserted.\n`);
  console.log(`📊 Summary (${elapsed}s):`);
  for (const [key, count] of Object.entries(result)) {
    console.log(`   ${key.padEnd(16)} ${count}`);
  }
  console.log();

  return result;
}

// ── Entry point ──────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  const { createDb } = await import('./connection.ts');
  const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
  const db = createDb();
  migrate(db.db, { migrationsFolder: './drizzle' });
  await seed(db.db);
}
