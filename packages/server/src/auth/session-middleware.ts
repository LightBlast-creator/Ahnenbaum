/**
 * Session middleware — Hono middleware for authentication.
 *
 * In single-user mode: auto-creates a session cookie.
 * In multi-user mode: validates existing session (future).
 */

import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import type { Session } from '@ahnenbaum/core';
import { getAuthMode } from './auth-mode';
import { createSingleUserSession } from './single-user-provider';

const COOKIE_NAME = 'ahnenbaum_session';
const MAX_AGE = Number(process.env.SESSION_MAX_AGE) || 2592000; // 30 days

/**
 * Session middleware — attaches session to context.
 */
export const sessionMiddleware = createMiddleware(async (c, next) => {
  const mode = getAuthMode();

  if (mode === 'single-user') {
    // Check for existing session cookie
    const existing = getCookie(c, COOKIE_NAME);
    let session: Session;

    if (existing) {
      try {
        session = JSON.parse(existing) as Session;
      } catch {
        // Invalid cookie — create new
        session = createSingleUserSession();
      }
    } else {
      session = createSingleUserSession();
    }

    // Set/refresh the cookie
    setCookie(c, COOKIE_NAME, JSON.stringify(session), {
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: MAX_AGE,
      path: '/',
    });

    // Attach session to context
    c.set('session', session);
  }

  await next();
});
