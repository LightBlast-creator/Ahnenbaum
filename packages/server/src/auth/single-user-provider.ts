/**
 * Single-user auth provider — auto-session with owner role.
 *
 * When AUTH_MODE=single-user (the default), every request
 * gets an automatic session with role: 'owner'. No login required.
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Session } from '@ahnenbaum/core';
import { SESSION_SECRET_PATH } from '../paths';

/**
 * Get or generate a persistent session secret.
 */
export function getSessionSecret(): string {
  // Check env first
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // Read from file if exists
  if (existsSync(SESSION_SECRET_PATH)) {
    return readFileSync(SESSION_SECRET_PATH, 'utf-8').trim();
  }

  // Generate and persist
  const secret = randomBytes(32).toString('hex');
  mkdirSync(dirname(SESSION_SECRET_PATH), { recursive: true });
  writeFileSync(SESSION_SECRET_PATH, secret, { mode: 0o600 });
  console.info('[Auth] Generated new session secret');
  return secret;
}

/**
 * Create a single-user session.
 */
export function createSingleUserSession(): Session {
  return {
    userId: 'default-user',
    role: 'owner',
    createdAt: new Date().toISOString(),
  };
}
