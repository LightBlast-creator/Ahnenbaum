/**
 * PluginContext — the typed API surface a plugin receives on activate().
 *
 * This is the primary interface plugins interact with. It provides
 * event subscription, configuration, logging, and database access.
 */

import type { HookName, HookPayloads, Disposable } from './hooks';

/**
 * Scoped logger for a plugin.
 */
export interface PluginLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * PluginContext — what a plugin receives when activate() is called.
 */
export interface PluginContext {
  /** Plugin name (for scoping) */
  readonly pluginName: string;

  /**
   * Subscribe to a lifecycle event.
   * Returns a Disposable for unsubscribing.
   */
  on<H extends HookName>(
    hook: H,
    callback: (payload: HookPayloads[H]) => void | Promise<void>,
  ): Disposable;

  /**
   * Emit an event (for inter-plugin communication).
   */
  emit<H extends HookName>(hook: H, payload: HookPayloads[H]): void;

  /**
   * Read plugin-specific configuration from environment or config file.
   */
  getConfig<T = string>(key: string): T | undefined;

  /** Scoped logger for this plugin */
  readonly logger: PluginLogger;

  /**
   * Database access.
   *
   * WARNING: Plugins get raw SQL access. Use with care.
   * In the future, this may be replaced with a scoped API.
   */
  readonly db: {
    query<T>(sql: string, params?: unknown[]): T[];
  };
}
