/**
 * Drizzle schema — persons and person_names tables.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const persons = sqliteTable('persons', {
  id: text('id').primaryKey(),
  sex: text('sex', { enum: ['male', 'female', 'intersex', 'unknown'] })
    .notNull()
    .default('unknown'),
  notes: text('notes'),
  privacy: text('privacy', { enum: ['public', 'users_only', 'owner_only'] })
    .notNull()
    .default('public'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const personNames = sqliteTable(
  'person_names',
  {
    id: text('id').primaryKey(),
    personId: text('person_id')
      .notNull()
      .references(() => persons.id),
    given: text('given').notNull().default(''),
    surname: text('surname').notNull().default(''),
    maiden: text('maiden'),
    nickname: text('nickname'),
    type: text('type', { enum: ['birth', 'married', 'alias'] })
      .notNull()
      .default('birth'),
    isPreferred: integer('is_preferred', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_person_names_surname').on(table.surname)],
);
