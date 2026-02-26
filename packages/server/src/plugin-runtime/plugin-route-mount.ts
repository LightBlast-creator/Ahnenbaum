/**
 * Plugin route mount — dynamic Hono route mounting for plugins.
 *
 * Creates a child Hono app per plugin, mounted under
 * /api/plugins/{pluginName}/. Uses a Map so plugins can be
 * added/removed at runtime.
 */

import { Hono } from 'hono';
import type { AhnenbaumPlugin, RouteDefinition } from '@ahnenbaum/core';
import type { Context } from 'hono';

/**
 * Creates a child Hono app from a plugin's route definitions.
 */
export function createPluginRouter(plugin: AhnenbaumPlugin): Hono | null {
  if (!plugin.routes || plugin.routes.length === 0) return null;

  const router = new Hono();

  for (const route of plugin.routes) {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    const handler = route.handler as (c: Context) => Response | Promise<Response>;

    router[method](route.path, handler);
  }

  return router;
}

/**
 * PluginRouteRegistry — manages dynamic plugin route mounting.
 *
 * Since Hono doesn't natively support route unmounting, we maintain
 * a Map of plugin routers and rebuild a master plugin router when
 * plugins change.
 */
export class PluginRouteRegistry {
  private routes = new Map<string, Hono>();
  private masterRouter: Hono;

  constructor() {
    this.masterRouter = new Hono();
  }

  /**
   * Register a plugin's routes.
   */
  mount(pluginName: string, routes: RouteDefinition[]): void {
    if (routes.length === 0) return;

    const router = new Hono();
    for (const route of routes) {
      const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      const handler = route.handler as (c: Context) => Response | Promise<Response>;
      router[method](route.path, handler);
    }

    this.routes.set(pluginName, router);
    this.rebuild();
  }

  /**
   * Unmount a plugin's routes.
   */
  unmount(pluginName: string): void {
    if (this.routes.delete(pluginName)) {
      this.rebuild();
    }
  }

  /**
   * Get the master router to mount on the main app.
   */
  getRouter(): Hono {
    return this.masterRouter;
  }

  /**
   * Rebuild the master router from all plugin routers.
   */
  private rebuild(): void {
    this.masterRouter = new Hono();
    for (const [name, router] of this.routes) {
      this.masterRouter.route(`/${name}`, router);
    }
  }
}
