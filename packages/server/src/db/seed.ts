import { createDb, type DbConnection } from './connection';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// ─── Entity seed stubs ───────────────────────────────────────────────
// Each function will be fleshed out in Phase 2 once the schema tables
// are defined in schema.ts.

export interface SeedResult {
  persons: number;
  relationships: number;
  events: number;
  places: number;
  sources: number;
  media: number;
}

/** Delete all rows in reverse-FK order. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearAll(_db: BetterSQLite3Database): void {
  // TODO (Phase 2): delete from tables in reverse-FK order
  //   e.g. db.delete(media), db.delete(sources), ...
  console.log('  ⏭  clearAll: no tables yet — skipping');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedPersons(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert person records
  console.log('  ⏭  persons: no schema yet — skipping');
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedRelationships(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert relationship records
  console.log('  ⏭  relationships: no schema yet — skipping');
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedEvents(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert event records
  console.log('  ⏭  events: no schema yet — skipping');
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedPlaces(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert place records
  console.log('  ⏭  places: no schema yet — skipping');
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedSources(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert source records
  console.log('  ⏭  sources: no schema yet — skipping');
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seedMedia(_db: BetterSQLite3Database): number {
  // TODO (Phase 2): insert media records
  console.log('  ⏭  media: no schema yet — skipping');
  return 0;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Run the full seed pipeline against an existing connection.
 *
 * Exported so tests can call it with an in-memory DB without going
 * through the CLI entry-point.
 */
export function seed(conn: DbConnection): SeedResult {
  const { db } = conn;

  console.log('\n🌱 Seeding database…\n');

  // 1. Clear existing data (idempotent)
  console.log('── Clear ──');
  clearAll(db);

  // 2. Insert seed data
  console.log('\n── Insert ──');
  const result: SeedResult = {
    persons: seedPersons(db),
    relationships: seedRelationships(db),
    events: seedEvents(db),
    places: seedPlaces(db),
    sources: seedSources(db),
    media: seedMedia(db),
  };

  // 3. Summary
  const total = Object.values(result).reduce((sum, n) => sum + n, 0);
  console.log(`\n✅ Seed complete — ${total} rows inserted.`);

  return result;
}

// ─── CLI entry-point ─────────────────────────────────────────────────

async function main(): Promise<void> {
  const start = performance.now();

  const conn = createDb();

  try {
    const result = seed(conn);

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`\n📊 Summary (${elapsed}s):`);
    for (const [entity, count] of Object.entries(result)) {
      console.log(`   ${entity.padEnd(16)} ${count}`);
    }
  } finally {
    conn.sqlite.close();
  }
}

// Only run when executed directly (not imported)
main().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
