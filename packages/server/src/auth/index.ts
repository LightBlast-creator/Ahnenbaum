/**
 * Auth module barrel — re-exports for use by app factory.
 */

export { getAuthMode } from './auth-mode';
export { sessionMiddleware } from './session-middleware';
export { createSingleUserSession, getSessionSecret } from './single-user-provider';
