/**
 * Auth types — session, auth mode, user roles.
 */

/** Authentication mode. */
export type AuthMode = 'single-user' | 'multi-user';

/** User role for authorization. */
export type UserRole = 'owner' | 'editor' | 'viewer';

/** Session data stored in cookie / context. */
export interface Session {
  readonly userId: string;
  readonly role: UserRole;
  readonly createdAt: string;
}
