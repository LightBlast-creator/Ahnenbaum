/**
 * Core plugin types — AhnenbaumPlugin interface and related types.
 *
 * This is the public contract that all plugins implement.
 */

import type { PluginContext } from './plugin-context';
import type { RouteDefinition } from './routes';
import type { PanelDefinition } from './panels';
import type { HookRegistration } from './hooks';
import type { SchemaExtension } from './schemas';

/**
 * The main plugin interface — every plugin must implement this.
 */
export interface AhnenbaumPlugin {
  /** Unique plugin identifier, e.g. "plugin-charts" */
  readonly name: string;
  /** Semver version string, e.g. "1.0.0" */
  readonly version: string;
  /** Human-readable description */
  readonly description?: string;
  /** Plugin author */
  readonly author?: string;
  /** Minimum core version required (semver range) */
  readonly coreVersion?: string;

  /**
   * Called when the plugin is loaded — set up hooks, routes, panels.
   * Must not throw — if it does, the plugin is marked as failed.
   */
  activate(ctx: PluginContext): Promise<void>;

  /**
   * Called when the plugin is unloaded — clean up resources.
   * Optional — plugins without cleanup can omit this.
   */
  deactivate?(): Promise<void>;

  /** API route definitions to mount under /api/plugins/{name}/ */
  readonly routes?: RouteDefinition[];
  /** UI panel definitions to inject into slot locations */
  readonly panels?: PanelDefinition[];
  /** Event hooks to subscribe to */
  readonly hooks?: HookRegistration[];
  /** Schema extensions (future — stub interface) */
  readonly schemas?: SchemaExtension[];
}

/**
 * Plugin metadata — returned by GET /api/plugins.
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  status: PluginStatus;
  panels?: PanelDefinition[];
}

/**
 * Plugin lifecycle status.
 */
export type PluginStatus = 'active' | 'failed' | 'inactive';
