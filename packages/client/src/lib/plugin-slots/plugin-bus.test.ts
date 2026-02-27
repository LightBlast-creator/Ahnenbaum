/**
 * Client-side event bus unit tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { pluginBus, PLUGIN_EVENTS } from './plugin-bus';

// Use a fresh instance rather than the singleton for isolation
// Since ClientEventBus is not exported, we test via the singleton but reset state

describe('pluginBus', () => {
  it('fires callback on emit', () => {
    const cb = vi.fn();
    const unsub = pluginBus.on('test.event', cb);

    pluginBus.emit('test.event', { key: 'value' });
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith({ key: 'value' });

    unsub();
  });

  it('returns an unsubscribe function', () => {
    const cb = vi.fn();
    const unsub = pluginBus.on('unsub.test', cb);

    unsub();
    pluginBus.emit('unsub.test');
    expect(cb).not.toHaveBeenCalled();
  });

  it('emit with no listeners does not throw', () => {
    expect(() => pluginBus.emit('no.listeners.here')).not.toThrow();
  });

  it('emit passes default empty payload', () => {
    const cb = vi.fn();
    const unsub = pluginBus.on('empty.payload', cb);

    pluginBus.emit('empty.payload');
    expect(cb).toHaveBeenCalledWith({});

    unsub();
  });

  it('callback error does not break other listeners', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cb1 = vi.fn(() => {
      throw new Error('boom');
    });
    const cb2 = vi.fn();

    const unsub1 = pluginBus.on('error.test', cb1);
    const unsub2 = pluginBus.on('error.test', cb2);

    pluginBus.emit('error.test');

    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
    expect(errSpy).toHaveBeenCalledOnce();

    unsub1();
    unsub2();
    errSpy.mockRestore();
  });

  it('supports multiple listeners for same event', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const unsub1 = pluginBus.on('multi', cb1);
    const unsub2 = pluginBus.on('multi', cb2);

    pluginBus.emit('multi', { data: 1 });
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();

    unsub1();
    unsub2();
  });
});

describe('PLUGIN_EVENTS', () => {
  it('exports expected event names', () => {
    expect(PLUGIN_EVENTS.ROUTE_CHANGED).toBe('route.changed');
    expect(PLUGIN_EVENTS.PERSON_SELECTED).toBe('person.selected');
    expect(PLUGIN_EVENTS.THEME_CHANGED).toBe('theme.changed');
    expect(PLUGIN_EVENTS.LOCALE_CHANGED).toBe('locale.changed');
  });
});
