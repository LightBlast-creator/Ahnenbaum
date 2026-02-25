/**
 * Drizzle schema — sources and citations tables.
 *
 * Evidence chain: Source → Citation → Event/Fact
 */

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const sources = sqliteTable(
  'sources',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    author: text('author'),
    publisher: text('publisher'),
    publicationDate: text('publication_date'),
    repositoryName: text('repository_name'),
    url: text('url'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_sources_title').on(table.title)],
);

export const citations = sqliteTable('citations', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => sources.id),
  detail: text('detail'),
  page: text('page'),
  confidence: text('confidence', {
    enum: ['primary', 'secondary', 'questionable', 'unreliable'],
  }),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});
