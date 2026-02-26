/**
 * Client-side event bus — lightweight pub/sub for UI events.
 *
 * Used by plugins and core components to communicate
 * without tight coupling.
 */

type EventCallback = (payload: Record<string, unknown>) => void;

class ClientEventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, callback: EventCallback): () => void {
    const existing = this.listeners.get(event);
    const set = existing ?? new Set<EventCallback>();
    if (!existing) this.listeners.set(event, set);
    set.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, payload: Record<string, unknown> = {}): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[PluginBus] Error in listener for "${event}":`, err);
      }
    }
  }
}

/** Singleton client event bus. */
export const pluginBus = new ClientEventBus();

// Common event names
export const PLUGIN_EVENTS = {
  ROUTE_CHANGED: 'route.changed',
  PERSON_SELECTED: 'person.selected',
  THEME_CHANGED: 'theme.changed',
  LOCALE_CHANGED: 'locale.changed',
} as const;
