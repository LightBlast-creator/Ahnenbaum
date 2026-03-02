/**
 * Schema barrel — re-exports all Drizzle table definitions.
 *
 * Import from here (or from '../db.ts') for queries and migrations.
 */

export { persons, personNames } from './persons.ts';
export { places } from './places.ts';
export { relationships } from './relationships.ts';
export { sources, citations } from './sources.ts';
export { events } from './events.ts';
export { media, mediaLinks } from './media.ts';
