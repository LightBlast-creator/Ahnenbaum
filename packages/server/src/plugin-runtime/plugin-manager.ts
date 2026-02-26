/**
 * Plugin manager — lifecycle orchestration for all plugins.
 *
 * Responsible for discovering, activating, deactivating, and
 * querying plugins. Coordinates with EventBus and PluginRouteRegistry.
 */

import type {
  AhnenbaumPlugin,
  PluginContext,
  PluginMetadata,
  PluginStatus,
  Disposable,
  HookName,
  HookPayloads,
  PanelDefinition,
} from '@ahnenbaum/core';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { EventBus } from './event-bus';
import { discoverPlugins } from './plugin-loader';
import { PluginRouteRegistry } from './plugin-route-mount';

interface ManagedPlugin {
  plugin: AhnenbaumPlugin;
  status: PluginStatus;
  disposables: Disposable[];
  path: string;
}

export class PluginManager {
  private plugins = new Map<string, ManagedPlugin>();
  private readonly eventBus: EventBus;
  private readonly routeRegistry: PluginRouteRegistry;
  private readonly db: BetterSQLite3Database;
  private readonly rawDb: { prepare(sql: string): { all(...params: unknown[]): unknown[] } };

  constructor(
    db: BetterSQLite3Database,
    rawDb: { prepare(sql: string): { all(...params: unknown[]): unknown[] } },
    eventBus?: EventBus,
    routeRegistry?: PluginRouteRegistry,
  ) {
    this.db = db;
    this.rawDb = rawDb;
    this.eventBus = eventBus ?? new EventBus();
    this.routeRegistry = routeRegistry ?? new PluginRouteRegistry();
  }

  async loadAll(pluginDir: string): Promise<void> {
    const discovered = await discoverPlugins(pluginDir);

    for (const { plugin, path } of discovered) {
      if (this.plugins.has(plugin.name)) {
        console.error(
          `[PluginManager] Duplicate plugin name "${plugin.name}" — skipping from ${path}`,
        );
        continue;
      }
      await this.activate(plugin, path);
    }
  }

  async activate(plugin: AhnenbaumPlugin, path: string = ''): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      console.error(`[PluginManager] Plugin "${plugin.name}" already loaded`);
      return;
    }

    const managed: ManagedPlugin = {
      plugin,
      status: 'inactive',
      disposables: [],
      path,
    };

    this.plugins.set(plugin.name, managed);

    try {
      const ctx = this.createContext(plugin.name, managed);

      if (plugin.hooks) {
        for (const hook of plugin.hooks) {
          const disposable = this.eventBus.on(hook.hook, hook.callback);
          managed.disposables.push(disposable);
        }
      }

      if (plugin.routes && plugin.routes.length > 0) {
        this.routeRegistry.mount(plugin.name, plugin.routes);
      }

      await plugin.activate(ctx);

      managed.status = 'active';
      console.info(`[PluginManager] Activated: ${plugin.name}@${plugin.version}`);
      this.eventBus.emit('plugin.activated', { pluginName: plugin.name });
    } catch (err) {
      managed.status = 'failed';
      console.error(`[PluginManager] Failed to activate "${plugin.name}":`, err);
    }
  }

  async deactivate(name: string): Promise<void> {
    const managed = this.plugins.get(name);
    if (!managed) return;

    try {
      if (managed.plugin.deactivate) {
        await managed.plugin.deactivate();
      }

      for (const disposable of managed.disposables) {
        disposable.dispose();
      }

      this.routeRegistry.unmount(name);
      managed.status = 'inactive';
      console.info(`[PluginManager] Deactivated: ${name}`);
      this.eventBus.emit('plugin.deactivated', { pluginName: name });
    } catch (err) {
      console.error(`[PluginManager] Error deactivating "${name}":`, err);
    }

    this.plugins.delete(name);
  }

  async deactivateAll(): Promise<void> {
    const names = Array.from(this.plugins.keys());
    for (const name of names) {
      await this.deactivate(name);
    }
  }

  list(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(({ plugin, status }) => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      status,
      panels: plugin.panels?.map((p: PanelDefinition) => ({ ...p, pluginName: plugin.name })),
    }));
  }

  get(name: string): PluginMetadata | undefined {
    const managed = this.plugins.get(name);
    if (!managed) return undefined;
    return {
      name: managed.plugin.name,
      version: managed.plugin.version,
      description: managed.plugin.description,
      author: managed.plugin.author,
      status: managed.status,
      panels: managed.plugin.panels?.map((p: PanelDefinition) => ({
        ...p,
        pluginName: managed.plugin.name,
      })),
    };
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getRouteRegistry(): PluginRouteRegistry {
    return this.routeRegistry;
  }

  activeCount(): number {
    let count = 0;
    for (const { status } of this.plugins.values()) {
      if (status === 'active') count++;
    }
    return count;
  }

  private createContext(pluginName: string, managed: ManagedPlugin): PluginContext {
    const eventBus = this.eventBus;
    const rawDb = this.rawDb;

    return {
      pluginName,

      on<H extends HookName>(
        hook: H,
        callback: (payload: HookPayloads[H]) => void | Promise<void>,
      ): Disposable {
        const disposable = eventBus.on(hook, callback);
        managed.disposables.push(disposable);
        return disposable;
      },

      emit<H extends HookName>(hook: H, payload: HookPayloads[H]): void {
        eventBus.emit(hook, payload);
      },

      getConfig<T = string>(key: string): T | undefined {
        const envKey = `PLUGIN_${pluginName.toUpperCase().replace(/-/g, '_')}_${key.toUpperCase()}`;
        const value = process.env[envKey];
        return value as T | undefined;
      },

      logger: {
        debug: (msg: string, ctx?: Record<string, unknown>) =>
          console.debug(`[${pluginName}] ${msg}`, ctx ?? ''),
        info: (msg: string, ctx?: Record<string, unknown>) =>
          console.info(`[${pluginName}] ${msg}`, ctx ?? ''),
        warn: (msg: string, ctx?: Record<string, unknown>) =>
          console.warn(`[${pluginName}] ${msg}`, ctx ?? ''),
        error: (msg: string, ctx?: Record<string, unknown>) =>
          console.error(`[${pluginName}] ${msg}`, ctx ?? ''),
      },

      db: {
        query<T>(sql: string, params?: unknown[]): T[] {
          const stmt = rawDb.prepare(sql);
          return stmt.all(...(params ?? [])) as T[];
        },
      },
    };
  }
}
