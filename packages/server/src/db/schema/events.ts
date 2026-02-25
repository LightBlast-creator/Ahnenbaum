/**
 * Drizzle schema — events table.
 *
 * Events are the extensible fact system. Each event is linked to
 * either a person OR a relationship, with optional place and citation.
 */

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { persons } from './persons';
import { relationships } from './relationships';
import { places } from './places';
import { citations } from './sources';

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    type: text('type', {
      enum: [
        'birth',
        'death',
        'marriage',
        'baptism',
        'burial',
        'immigration',
        'emigration',
        'occupation',
        'residence',
        'military_service',
        'education',
        'census',
        'custom',
      ],
    }).notNull(),
    /** JSON-serialized GenealogyDate. */
    date: text('date'),
    placeId: text('place_id').references(() => places.id),
    personId: text('person_id').references(() => persons.id),
    relationshipId: text('relationship_id').references(() => relationships.id),
    description: text('description'),
    notes: text('notes'),
    citationId: text('citation_id').references(() => citations.id),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_events_person_id').on(table.personId)],
);
