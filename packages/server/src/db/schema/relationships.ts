/**
 * Drizzle schema — relationships table.
 *
 * Typed edge graph: (PersonA) —[type, metadata]→ (PersonB)
 */

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { persons } from './persons';
import { places } from './places';

export const relationships = sqliteTable(
  'relationships',
  {
    id: text('id').primaryKey(),
    personAId: text('person_a_id')
      .notNull()
      .references(() => persons.id),
    personBId: text('person_b_id')
      .notNull()
      .references(() => persons.id),
    type: text('type', {
      enum: [
        'biological_parent',
        'adoptive_parent',
        'step_parent',
        'foster_parent',
        'guardian',
        'godparent',
        'marriage',
        'civil_partnership',
        'domestic_partnership',
        'cohabitation',
        'engagement',
        'custom',
      ],
    }).notNull(),
    /** JSON-serialized GenealogyDate. */
    startDate: text('start_date'),
    /** JSON-serialized GenealogyDate. */
    endDate: text('end_date'),
    placeId: text('place_id').references(() => places.id),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_relationships_person_a').on(table.personAId),
    index('idx_relationships_person_b').on(table.personBId),
  ],
);
