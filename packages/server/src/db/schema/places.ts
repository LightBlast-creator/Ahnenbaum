/**
 * Drizzle schema — places table.
 *
 * Self-referencing parentId for hierarchy:
 *   Munich → Bavaria → Germany
 */

import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';

export const places = sqliteTable(
  'places',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Self-referencing FK for hierarchy. */
    parentId: text('parent_id'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_places_name').on(table.name)],
);
