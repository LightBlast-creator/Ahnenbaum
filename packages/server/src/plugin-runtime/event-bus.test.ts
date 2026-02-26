/**
 * Event bus unit tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { EventBus } from './event-bus';

describe('EventBus', () => {
  it('delivers event to subscriber', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    bus.on('person.created', callback);
    bus.emit('person.created', { personId: '123', person: { id: '123' } });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith({ personId: '123', person: { id: '123' } });
  });

  it('delivers to multiple subscribers in order', () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.on('person.created', () => {
      order.push(1);
    });
    bus.on('person.created', () => {
      order.push(2);
    });
    bus.on('person.created', () => {
      order.push(3);
    });

    bus.emit('person.created', { personId: '1', person: {} });

    expect(order).toEqual([1, 2, 3]);
  });

  it('unsubscribes via dispose()', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    const disposable = bus.on('person.deleted', callback);
    disposable.dispose();

    bus.emit('person.deleted', { personId: '1' });
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not crash when emitting with no listeners', () => {
    const bus = new EventBus();
    expect(() => {
      bus.emit('person.created', { personId: '1', person: {} });
    }).not.toThrow();
  });

  it('isolates errors in listeners', () => {
    const bus = new EventBus();
    const good = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('person.created', () => {
      throw new Error('boom');
    });
    bus.on('person.created', good);

    bus.emit('person.created', { personId: '1', person: {} });

    expect(good).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('tracks listener count', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('person.created')).toBe(0);

    const d1 = bus.on('person.created', () => {});
    const d2 = bus.on('person.created', () => {});
    expect(bus.listenerCount('person.created')).toBe(2);

    d1.dispose();
    expect(bus.listenerCount('person.created')).toBe(1);

    d2.dispose();
    expect(bus.listenerCount('person.created')).toBe(0);
  });

  it('removeAll() clears specific hook', () => {
    const bus = new EventBus();
    bus.on('person.created', () => {});
    bus.on('person.deleted', () => {});

    bus.removeAll('person.created');

    expect(bus.listenerCount('person.created')).toBe(0);
    expect(bus.listenerCount('person.deleted')).toBe(1);
  });

  it('removeAll() without argument clears everything', () => {
    const bus = new EventBus();
    bus.on('person.created', () => {});
    bus.on('person.deleted', () => {});

    bus.removeAll();

    expect(bus.listenerCount('person.created')).toBe(0);
    expect(bus.listenerCount('person.deleted')).toBe(0);
  });

  it('typed payloads work correctly', () => {
    const bus = new EventBus();
    const callback = vi.fn();

    bus.on('person.updated', callback);
    bus.emit('person.updated', {
      personId: '1',
      person: { id: '1', sex: 'male' },
      changes: { sex: 'female' },
    });

    expect(callback).toHaveBeenCalledWith({
      personId: '1',
      person: { id: '1', sex: 'male' },
      changes: { sex: 'female' },
    });
  });
});
