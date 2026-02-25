/**
 * Media API routes.
 *
 * Endpoints:
 *   POST   /api/media           — Upload a media file
 *   GET    /api/media           — List media (paginated, filterable)
 *   GET    /api/media/:id       — Get media metadata
 *   GET    /api/media/:id/file  — Stream original file
 *   GET    /api/media/:id/thumb — Stream thumbnail
 *   DELETE /api/media/:id       — Soft-delete a media record
 */

import { Hono } from 'hono';
import { apiSuccess, apiError } from '../utils/api-response';
import * as mediaService from '../services/media-service';
import type { StorageAdapter } from '../storage/local-storage';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { MediaType } from '@ahnenbaum/core';

/**
 * Create media routes.
 *
 * Accepts both a database and storage adapter for testability.
 */
export function createMediaRoutes(db: BetterSQLite3Database, storage: StorageAdapter): Hono {
  const router = new Hono();

  // POST /api/media — upload a file
  router.post('/', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return apiError(c, {
        code: 'VALIDATION_ERROR',
        message: 'No file provided. Send a multipart form with a "file" field.',
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: file.name,
      mimeType: file.type,
      data,
      caption: typeof body['caption'] === 'string' ? body['caption'] : undefined,
      description: typeof body['description'] === 'string' ? body['description'] : undefined,
      date: typeof body['date'] === 'string' ? body['date'] : undefined,
      placeId: typeof body['placeId'] === 'string' ? body['placeId'] : undefined,
    });

    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data, 201);
  });

  // GET /api/media — list media
  router.get('/', (c) => {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const type = c.req.query('type') as MediaType | undefined;

    const result = mediaService.listMedia(db, { page, limit, type });
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/media/:id — get metadata
  router.get('/:id', (c) => {
    const id = c.req.param('id');

    // Avoid matching /api/media/:id/file and /api/media/:id/thumb
    if (id === 'file' || id === 'thumb') return c.notFound();

    const result = mediaService.getMediaById(db, id);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, result.data);
  });

  // GET /api/media/:id/file — stream original file
  router.get('/:id/file', async (c) => {
    const id = c.req.param('id');
    const result = mediaService.getMediaById(db, id);
    if (!result.ok) return apiError(c, result.error);

    const fileData = await storage.get(id, result.data.originalFilename);
    if (!fileData) {
      return apiError(c, {
        code: 'NOT_FOUND',
        message: 'Media file not found on disk',
      });
    }

    return new Response(new Uint8Array(fileData), {
      status: 200,
      headers: {
        'Content-Type': result.data.mimeType,
        'Content-Length': fileData.length.toString(),
        'Content-Disposition': `inline; filename="${result.data.originalFilename.replace(/["/\\\r\n]/g, '_')}"`,
      },
    });
  });

  // GET /api/media/:id/thumb — stream thumbnail
  router.get('/:id/thumb', async (c) => {
    const id = c.req.param('id');
    const result = mediaService.getMediaById(db, id);
    if (!result.ok) return apiError(c, result.error);

    const thumbName = mediaService.getThumbFilename(result.data.originalFilename);
    const thumbData = await storage.get(id, thumbName);
    if (!thumbData) {
      // No thumbnail available — return 404
      return apiError(c, {
        code: 'NOT_FOUND',
        message: 'Thumbnail not available for this media',
      });
    }

    return new Response(new Uint8Array(thumbData), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': thumbData.length.toString(),
      },
    });
  });

  // DELETE /api/media/:id — soft-delete
  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await mediaService.deleteMedia(db, storage, id);
    if (!result.ok) return apiError(c, result.error);
    return apiSuccess(c, null, 204);
  });

  return router;
}
