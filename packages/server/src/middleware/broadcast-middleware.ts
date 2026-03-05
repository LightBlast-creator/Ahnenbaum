/**
 * WebSocket broadcast middleware — automatically notifies all connected
 * clients when any API mutation succeeds.
 *
 * Intercepts POST, PATCH, PUT, DELETE on /api/* routes. After the handler
 * returns a 2xx response, broadcasts a `data.changed` message over WebSocket.
 *
 * This replaces manual eventBus.emit() calls for WS broadcasting,
 * ensuring every mutation — current and future — triggers real-time sync.
 */

import { createMiddleware } from 'hono/factory';
import type { WsHub } from '../ws/ws-hub.ts';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Create the broadcast middleware. Requires a WsHub instance.
 * If hub is undefined (e.g. in tests), the middleware is a no-op.
 */
export function createBroadcastMiddleware(hub?: WsHub) {
  return createMiddleware(async (c, next) => {
    await next();

    // Skip if no hub, not a mutation, or not a success response
    if (!hub) return;
    if (!MUTATION_METHODS.has(c.req.method)) return;
    if (c.res.status < 200 || c.res.status >= 300) return;

    // Extract the resource type from the URL path
    // e.g. /api/persons/123/names/456 → 'persons'
    const path = new URL(c.req.url).pathname;
    const segments = path.split('/').filter(Boolean); // ['api', 'persons', '123', ...]
    const resource = segments[1] ?? 'unknown'; // 'persons', 'places', etc.

    hub.broadcast({
      type: 'data.changed',
      payload: {
        resource,
        method: c.req.method,
        path,
      },
      timestamp: new Date().toISOString(),
    });
  });
}
