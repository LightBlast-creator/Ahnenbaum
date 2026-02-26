/**
 * Auth mode — determines which authentication provider to use.
 */

import type { AuthMode } from '@ahnenbaum/core';

const VALID_MODES: AuthMode[] = ['single-user', 'multi-user'];

/**
 * Get the current auth mode from environment.
 * Defaults to 'single-user' if not set or invalid.
 */
export function getAuthMode(): AuthMode {
  const raw = process.env.AUTH_MODE;
  if (raw && VALID_MODES.includes(raw as AuthMode)) {
    return raw as AuthMode;
  }
  if (raw) {
    console.warn(`[Auth] Invalid AUTH_MODE "${raw}" — defaulting to "single-user"`);
  }
  return 'single-user';
}
