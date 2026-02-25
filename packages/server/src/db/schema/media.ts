/**
 * Drizzle schema — media and media_links tables.
 *
 * Media files link to multiple entities via the polymorphic media_links table.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { places } from './places';

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['image', 'pdf', 'video', 'audio'] }).notNull(),
  filename: text('filename').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  caption: text('caption'),
  date: text('date'),
  placeId: text('place_id').references(() => places.id),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const mediaLinks = sqliteTable(
  'media_links',
  {
    id: text('id').primaryKey(),
    mediaId: text('media_id')
      .notNull()
      .references(() => media.id),
    linkedEntityType: text('linked_entity_type', {
      enum: ['person', 'event', 'relationship', 'source'],
    }).notNull(),
    linkedEntityId: text('linked_entity_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_media_links_media_id').on(table.mediaId)],
);
