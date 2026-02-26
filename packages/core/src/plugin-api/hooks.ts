/**
 * Hook system types — typed lifecycle events for the plugin system.
 *
 * Plugins subscribe to hooks via `ctx.on(hook, callback)`.
 * Core services emit hooks after mutations.
 */

// ── Hook Names ───────────────────────────────────────────────────────

export type HookName =
  | 'person.created'
  | 'person.updated'
  | 'person.deleted'
  | 'relationship.created'
  | 'relationship.deleted'
  | 'media.uploaded'
  | 'media.deleted'
  | 'tree.exported'
  | 'tree.imported'
  | 'plugin.activated'
  | 'plugin.deactivated';

// ── Hook Payloads ────────────────────────────────────────────────────

/**
 * Typed payloads for each hook.
 *
 * Uses inline shapes (not core domain interfaces) so plugin consumers
 * are decoupled from the exact domain model shape.
 */
export interface HookPayloads {
  'person.created': { personId: string; person: Record<string, unknown> };
  'person.updated': {
    personId: string;
    person: Record<string, unknown>;
    changes: Record<string, unknown>;
  };
  'person.deleted': { personId: string };
  'relationship.created': {
    relationshipId: string;
    relationship: Record<string, unknown>;
  };
  'relationship.deleted': { relationshipId: string };
  'media.uploaded': { mediaId: string; media: Record<string, unknown> };
  'media.deleted': { mediaId: string };
  'tree.exported': { format: string; personCount: number };
  'tree.imported': { format: string; personCount: number };
  'plugin.activated': { pluginName: string };
  'plugin.deactivated': { pluginName: string };
}

// ── Hook Registration ────────────────────────────────────────────────

/**
 * A hook registration — binds a hook name to a callback.
 * Used in `AhnenbaumPlugin.hooks` array.
 */
export interface HookRegistration<H extends HookName = HookName> {
  hook: H;
  callback: (payload: HookPayloads[H]) => void | Promise<void>;
}

/**
 * Disposable — returned by `ctx.on()` for unsubscribing.
 */
export interface Disposable {
  dispose(): void;
}
