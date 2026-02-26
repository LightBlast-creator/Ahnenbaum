/**
 * Event bus — typed pub/sub system for plugin lifecycle events.
 *
 * Synchronous event dispatch in registration order.
 * Each subscription returns a Disposable for unsubscribing.
 */

import type { HookName, HookPayloads, Disposable } from '@ahnenbaum/core';

type Listener<H extends HookName> = (payload: HookPayloads[H]) => void | Promise<void>;

export class EventBus {
  private listeners = new Map<HookName, Set<Listener<HookName>>>();

  /**
   * Subscribe to a hook event.
   * Returns a Disposable — call dispose() to unsubscribe.
   */
  on<H extends HookName>(hook: H, callback: Listener<H>): Disposable {
    const existing = this.listeners.get(hook);
    const set = existing ?? new Set<Listener<HookName>>();
    if (!existing) this.listeners.set(hook, set);
    set.add(callback as Listener<HookName>);

    return {
      dispose: () => {
        set.delete(callback as Listener<HookName>);
        if (set.size === 0) {
          this.listeners.delete(hook);
        }
      },
    };
  }

  /**
   * Emit an event — calls all listeners synchronously in registration order.
   * Errors in listeners are caught and logged, never propagated.
   */
  emit<H extends HookName>(hook: H, payload: HookPayloads[H]): void {
    const set = this.listeners.get(hook);
    if (!set) return;

    for (const listener of set) {
      try {
        const result = listener(payload);
        // If listener returns a Promise, catch rejections
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch((err) => {
            console.error(`[EventBus] Error in async listener for "${hook}":`, err);
          });
        }
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${hook}":`, err);
      }
    }
  }

  /**
   * Remove all listeners for a specific hook (used during cleanup).
   */
  removeAll(hook?: HookName): void {
    if (hook) {
      this.listeners.delete(hook);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get number of listeners for a specific hook (testing utility).
   */
  listenerCount(hook: HookName): number {
    return this.listeners.get(hook)?.size ?? 0;
  }
}
