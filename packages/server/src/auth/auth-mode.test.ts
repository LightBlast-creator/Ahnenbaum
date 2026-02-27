/**
 * auth-mode unit tests.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';
import { getAuthMode } from './auth-mode';

describe('getAuthMode', () => {
  const originalAuthMode = process.env.AUTH_MODE;

  afterEach(() => {
    if (originalAuthMode !== undefined) {
      process.env.AUTH_MODE = originalAuthMode;
    } else {
      delete process.env.AUTH_MODE;
    }
  });

  it('defaults to single-user when AUTH_MODE not set', () => {
    delete process.env.AUTH_MODE;
    expect(getAuthMode()).toBe('single-user');
  });

  it('returns single-user when explicitly set', () => {
    process.env.AUTH_MODE = 'single-user';
    expect(getAuthMode()).toBe('single-user');
  });

  it('returns multi-user when explicitly set', () => {
    process.env.AUTH_MODE = 'multi-user';
    expect(getAuthMode()).toBe('multi-user');
  });

  it('defaults to single-user and warns on invalid value', () => {
    process.env.AUTH_MODE = 'invalid-mode';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getAuthMode()).toBe('single-user');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('invalid-mode');

    warnSpy.mockRestore();
  });

  it('defaults to single-user on empty string', () => {
    process.env.AUTH_MODE = '';
    expect(getAuthMode()).toBe('single-user');
  });
});
