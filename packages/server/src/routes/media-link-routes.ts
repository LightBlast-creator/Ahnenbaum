/**
 * Media link API routes.
 *
 * Endpoints:
 *   POST   /api/media-links           — Create a link
 *   DELETE /api/media-links/:id       — Remove a link
 *   PATCH  /api/media-links/:id       — Update sort/caption/primary
 *   GET    /api/media-links/entity/:type/:id — Get media for entity
 *   GET    /api/media-links/media/:id — Get links for media (inverse)
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as mediaLinkService from '../services/media-link-service';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { MediaLinkEntityType } from '@ahnenbaum/core';

/**
 * Create media link routes.
 */
export function createMediaLinkRoutes(db: BetterSQLite3Database): Hono {
  const router = new Hono();

  // POST /api/media-links — create a link
  router.post('/', async (c) => {
    const body = await c.req.json();
    const validEntityTypes = ['person', 'event', 'relationship', 'source'];
    if (!validEntityTypes.includes(body.entityType)) {
      return apiError(c, {
        code: 'VALIDATION_ERROR',
        message: `Invalid entityType '${body.entityType}'. Must be one of: ${validEntityTypes.join(', ')}`,
      });
    }
    const result = mediaLinkService.createMediaLink(db, {
      mediaId: body.mediaId,
      entityType: body.entityType as MediaLinkEntityType,
      entityId: body.entityId,
      sortOrder: body.sortOrder,
      caption: body.caption,
      isPrimary: body.isPrimary,
    });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  // DELETE /api/media-links/:id — remove a link
  router.delete('/:id', (c) => {
    const id = c.req.param('id');
    const result = mediaLinkService.deleteMediaLink(db, id);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  // PATCH /api/media-links/:id — update sort/caption/primary
  router.patch('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = mediaLinkService.updateMediaLink(db, id, {
      sortOrder: body.sortOrder,
      caption: body.caption,
      isPrimary: body.isPrimary,
    });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/media-links/entity/:type/:id — get media for entity
  router.get('/entity/:type/:id', (c) => {
    const entityType = c.req.param('type') as MediaLinkEntityType;
    const entityId = c.req.param('id');
    const result = mediaLinkService.getMediaForEntity(db, entityType, entityId);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/media-links/media/:id — inverse lookup
  router.get('/media/:id', (c) => {
    const mediaId = c.req.param('id');
    const result = mediaLinkService.getLinksForMedia(db, mediaId);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  return router;
}
