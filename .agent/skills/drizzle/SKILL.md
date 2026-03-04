---
name: drizzle
description: Drizzle ORM patterns for SQLite with better-sqlite3. Schema definitions, queries, CRUD operations, migrations, relations, and type-safe SQL. Use when working with database schemas, writing queries, running migrations, or connecting to SQLite databases in this project.
---

# Drizzle ORM (SQLite)

Patterns for Drizzle ORM with SQLite via `better-sqlite3` as used in this project.

## Project Setup

```
packages/server/
  drizzle.config.ts        # Drizzle Kit config (dialect: sqlite)
  drizzle/                  # Generated migration SQL files
  src/db/
    connection.ts           # createDb() factory
    db-helpers.ts           # mustGet(), countRows()
    schema/
      index.ts              # Barrel export of all tables
      persons.ts            # persons + person_names
      places.ts             # hierarchical places
      relationships.ts      # typed edges (parent-child, partner)
      sources.ts            # sources + citations
      events.ts             # polymorphic life events
      media.ts              # media + media_links
```

## Connection

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('./data/ahnenbaum.db');
sqlite.pragma('journal_mode = WAL');    // Write-Ahead Log for concurrency
sqlite.pragma('foreign_keys = ON');     // Enforce FK constraints

const db = drizzle({ client: sqlite });
```

**Critical**: Always enable `foreign_keys = ON` — SQLite disables them by default.

## Schema Definition

```typescript
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const persons = sqliteTable('persons', {
  id: text('id').primaryKey(),
  sex: text('sex', { enum: ['male', 'female', 'intersex', 'unknown'] })
    .notNull().default('unknown'),
  notes: text('notes'),
  privacy: text('privacy', { enum: ['public', 'users_only', 'owner_only'] })
    .notNull().default('public'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const personNames = sqliteTable('person_names', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id),
  given: text('given').notNull().default(''),
  surname: text('surname').notNull().default(''),
  type: text('type', { enum: ['birth', 'married', 'alias'] })
    .notNull().default('birth'),
  isPreferred: integer('is_preferred', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('idx_person_names_surname').on(table.surname)]);
```

**Patterns used in this project**:
- `text('id').primaryKey()` — UUID strings as PKs
- `text('column', { enum: [...] })` — enum columns stored as text
- `integer('col', { mode: 'boolean' })` — boolean via integer 0/1
- `.references(() => table.col)` — inline FK references
- Index definitions as 3rd arg to `sqliteTable()`
- All timestamps as `text` (ISO 8601 strings)

## Queries

### Select

```typescript
import { eq, and, isNull, like } from 'drizzle-orm';

// Select all non-deleted
const all = db.select().from(persons).where(isNull(persons.deletedAt)).all();

// Select by ID
const one = db.select().from(persons).where(eq(persons.id, id)).get();

// Select with join
const withNames = db
  .select()
  .from(persons)
  .leftJoin(personNames, eq(persons.id, personNames.personId))
  .where(eq(persons.id, id))
  .all();

// Count rows
const [{ count }] = db.select({ count: sql`count(*)` }).from(persons).all();
```

### Insert

```typescript
db.insert(persons).values({
  id: crypto.randomUUID(),
  sex: 'unknown',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}).run();
```

### Update

```typescript
db.update(persons)
  .set({ notes: 'Updated', updatedAt: new Date().toISOString() })
  .where(eq(persons.id, id))
  .run();
```

### Delete (soft)

```typescript
db.update(persons)
  .set({ deletedAt: new Date().toISOString() })
  .where(eq(persons.id, id))
  .run();
```

## Migrations

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

Config in `packages/server/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? './data/ahnenbaum.db' },
});
```

## Common Patterns

### mustGet helper
```typescript
function mustGet<T>(result: T | undefined, entity: string, id: string): T {
  if (!result) throw new HTTPException(404, { message: `${entity} ${id} not found` });
  return result;
}
```

### Transaction
```typescript
db.transaction((tx) => {
  tx.insert(persons).values({ ... }).run();
  tx.insert(personNames).values({ ... }).run();
});
```

### Raw SQL
```typescript
import { sql } from 'drizzle-orm';

const result = db.all(sql`SELECT * FROM persons WHERE id = ${id}`);
```

## Rules

- All schema lives in `packages/server/src/db/schema/` — one file per entity
- Export everything from `schema/index.ts` barrel
- Use soft deletes (`deletedAt` column) — never hard delete
- UUIDs as text primary keys — generate with `crypto.randomUUID()`
- Timestamps as ISO 8601 text strings
- Run `npx drizzle-kit generate` after any schema change
