/**
 * Plugin route types — API route declarations for plugins.
 *
 * Plugin routes are mounted under `/api/plugins/{pluginName}/`.
 * The handler receives a Hono Context typed as `unknown` to avoid
 * coupling @ahnenbaum/core to hono — the runtime casts appropriately.
 */

export type RouteMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RouteDefinition {
  /** HTTP method */
  method: RouteMethod;
  /** Route path relative to /api/plugins/{pluginName}/ */
  path: string;
  /** Route handler — receives Hono Context (typed as unknown to avoid hono dep in core) */
  handler: (c: unknown) => Response | Promise<Response>;
  /** Human-readable description of the route */
  description?: string;
}
