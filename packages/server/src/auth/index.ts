/**
 * Auth module barrel — re-exports for use by app factory.
 */

export { getAuthMode } from './auth-mode.ts';
export { sessionMiddleware } from './session-middleware.ts';
export { createSingleUserSession, getSessionSecret } from './single-user-provider.ts';
