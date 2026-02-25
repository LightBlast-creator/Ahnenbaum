/**
 * @ahnenbaum/core — Shared types, constants, and plugin API
 *
 * This barrel file re-exports everything that other packages
 * (server, client, plugins) are allowed to import.
 */

export { APP_NAME, APP_VERSION } from './constants';
export type { HealthStatus } from './types';
export type { Person } from './models/index';
