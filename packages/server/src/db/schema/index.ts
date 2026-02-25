/**
 * Schema barrel — re-exports all Drizzle table definitions.
 *
 * Import from here (or from '../db') for queries and migrations.
 */

export { persons, personNames } from './persons';
export { places } from './places';
export { relationships } from './relationships';
export { sources, citations } from './sources';
export { events } from './events';
export { media, mediaLinks } from './media';
