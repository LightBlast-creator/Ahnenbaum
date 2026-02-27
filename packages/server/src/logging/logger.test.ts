/**
 * Logger unit tests.
 *
 * Tests log level filtering, createLogger scoping, and format behavior.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { createLogger } from './logger';

describe('createLogger', () => {
  it('creates a logger with all four methods', () => {
    const logger = createLogger('test-module');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('logs info messages to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createLogger('test');

    logger.info('hello');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('hello');

    spy.mockRestore();
  });

  it('logs error messages to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('test');

    logger.error('bad thing');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('bad thing');

    spy.mockRestore();
  });

  it('logs warn messages to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createLogger('test');

    logger.warn('careful');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('careful');

    spy.mockRestore();
  });

  it('includes module name in output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createLogger('my-module');

    logger.info('test message');
    expect(spy.mock.calls[0][0]).toContain('my-module');

    spy.mockRestore();
  });

  it('includes context when provided', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createLogger('ctx-test');

    logger.info('event', { userId: '123' });
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain('userId');

    spy.mockRestore();
  });

  it('works without module name', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = createLogger();

    logger.info('no module');
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});

describe('log level filtering', () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalLogLevel !== undefined) {
      process.env.LOG_LEVEL = originalLogLevel;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  it('suppresses debug when LOG_LEVEL=info (default)', async () => {
    delete process.env.LOG_LEVEL;
    // Need fresh module to pick up env change
    vi.resetModules();
    const { createLogger: freshLogger } = await import('./logger');

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = freshLogger('test');
    logger.debug('should be suppressed');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows debug when LOG_LEVEL=debug', async () => {
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    const { createLogger: freshLogger } = await import('./logger');

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = freshLogger('test');
    logger.debug('should appear');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
