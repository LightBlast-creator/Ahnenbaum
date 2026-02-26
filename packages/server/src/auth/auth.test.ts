/**
 * Auth module unit tests.
 */

import { describe, expect, it, afterEach } from 'vitest';
import { getAuthMode } from './auth-mode';
import { createSingleUserSession } from './single-user-provider';

describe('getAuthMode', () => {
  afterEach(() => {
    delete process.env.AUTH_MODE;
  });

  it('defaults to single-user', () => {
    delete process.env.AUTH_MODE;
    expect(getAuthMode()).toBe('single-user');
  });

  it('returns single-user when set', () => {
    process.env.AUTH_MODE = 'single-user';
    expect(getAuthMode()).toBe('single-user');
  });

  it('returns multi-user when set', () => {
    process.env.AUTH_MODE = 'multi-user';
    expect(getAuthMode()).toBe('multi-user');
  });

  it('defaults to single-user for unknown values', () => {
    process.env.AUTH_MODE = 'invalid';
    expect(getAuthMode()).toBe('single-user');
  });
});

describe('createSingleUserSession', () => {
  it('returns a valid session object', () => {
    const session = createSingleUserSession();

    expect(session).toHaveProperty('userId');
    expect(session).toHaveProperty('role', 'owner');
    expect(session).toHaveProperty('createdAt');
    expect(typeof session.userId).toBe('string');
    expect(session.userId.length).toBeGreaterThan(0);
  });

  it('returns consistent userId for single user', () => {
    const s1 = createSingleUserSession();
    const s2 = createSingleUserSession();
    expect(s1.userId).toBe(s2.userId);
  });

  it('always assigns owner role', () => {
    const session = createSingleUserSession();
    expect(session.role).toBe('owner');
  });
});

describe('sessionMiddleware', () => {
  it('is importable and is a function', async () => {
    const { sessionMiddleware } = await import('./session-middleware');
    expect(typeof sessionMiddleware).toBe('function');
  });
});
