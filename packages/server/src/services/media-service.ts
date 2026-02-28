/**
 * Media service — business logic for media upload, retrieval, and deletion.
 *
 * All methods return Result<T> — no thrown exceptions.
 * Thumbnail generation uses `sharp`, EXIF extraction uses `exifr`.
 */

import { eq, isNull, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { MediaType } from '@ahnenbaum/core';
import { media, mediaLinks } from '../db/schema/index';
import { mustGet, countRows } from '../db/db-helpers';
import { now, uuid } from '../db/helpers';
import type { StorageAdapter } from '../storage/local-storage';

// ── Constants ────────────────────────────────────────────────────────

/** Allowed MIME types mapped to MediaType categories. */
const MIME_TYPE_MAP: Record<string, MediaType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
  'application/pdf': 'pdf',
  'video/mp4': 'video',
  'video/webm': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
};

/** Default maximum file size: 50 MB. */
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

/** Thumbnail width in pixels. */
const THUMB_WIDTH = 300;

// ── Types ────────────────────────────────────────────────────────────

export interface UploadMediaInput {
  /** Original filename from the upload. */
  originalFilename: string;
  /** MIME type of the uploaded file. */
  mimeType: string;
  /** Raw file data. */
  data: Buffer;
  /** Optional metadata provided by the user. */
  caption?: string;
  description?: string;
  notes?: string;
  date?: string;
  placeId?: string;
}

export interface UpdateMediaInput {
  caption?: string | null;
  description?: string | null;
  notes?: string | null;
  date?: string | null;
  placeId?: string | null;
}

export interface ListMediaOptions {
  page?: number;
  limit?: number;
  type?: MediaType;
}

interface ExifData {
  dateTaken?: string;
  latitude?: number;
  longitude?: number;
  cameraModel?: string;
}

function getMediaType(mimeType: string): MediaType | undefined {
  return MIME_TYPE_MAP[mimeType.toLowerCase()];
}

function thumbFilename(originalFilename: string): string {
  // Strip extension, add thumb_ prefix and .webp extension
  const baseName = originalFilename.replace(/\.[^.]+$/, '');
  return `thumb_${baseName}.webp`;
}

// ── EXIF extraction ──────────────────────────────────────────────────

async function extractExif(data: Buffer, mimeType: string): Promise<ExifData> {
  if (!mimeType.startsWith('image/')) return {};

  try {
    const exifr = await import('exifr');
    const parsed = await exifr.parse(data, {
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'Model'],
    });

    if (!parsed) return {};

    return {
      dateTaken: parsed.DateTimeOriginal
        ? new Date(parsed.DateTimeOriginal).toISOString()
        : undefined,
      latitude: parsed.GPSLatitude ?? parsed.latitude,
      longitude: parsed.GPSLongitude ?? parsed.longitude,
      cameraModel: parsed.Model,
    };
  } catch {
    // EXIF extraction is best-effort — never fail the upload
    return {};
  }
}

// ── Thumbnail generation ─────────────────────────────────────────────

async function generateThumbnail(data: Buffer, mimeType: string): Promise<Buffer | null> {
  if (!mimeType.startsWith('image/')) return null;

  try {
    const sharp = (await import('sharp')).default;
    return await sharp(data)
      .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    // Thumbnail generation is best-effort — the original file is still saved
    return null;
  }
}

// ── Service methods ──────────────────────────────────────────────────

/**
 * Upload a media file: validate, save to storage, generate thumbnail,
 * extract EXIF, and persist the database record.
 */
export async function uploadMedia(
  db: BetterSQLite3Database,
  storage: StorageAdapter,
  input: UploadMediaInput,
  maxSize: number = DEFAULT_MAX_SIZE,
): Promise<Result<typeof media.$inferSelect>> {
  // Validate MIME type
  const mediaType = getMediaType(input.mimeType);
  if (!mediaType) {
    return err('VALIDATION_ERROR', 'Unsupported media type', {
      code: 'MEDIA_TYPE_UNSUPPORTED',
      mimeType: input.mimeType,
    });
  }

  // Validate file size
  if (input.data.length > maxSize) {
    return err('VALIDATION_ERROR', `File size exceeds maximum of ${maxSize} bytes`, {
      code: 'MEDIA_SIZE_EXCEEDED',
      size: input.data.length,
      maxSize,
    });
  }

  const id = uuid();
  const timestamp = now();

  // Save original file
  await storage.save(id, input.originalFilename, input.data);

  // Generate thumbnail (best-effort)
  const thumbnail = await generateThumbnail(input.data, input.mimeType);
  if (thumbnail) {
    const thumbName = thumbFilename(input.originalFilename);
    await storage.save(id, thumbName, thumbnail);
  }

  // Extract EXIF metadata (best-effort)
  const exif = await extractExif(input.data, input.mimeType);

  // Determine date — user-provided takes precedence over EXIF
  const mediaDate = input.date ?? exif.dateTaken ?? null;

  // Insert database record
  db.insert(media)
    .values({
      id,
      type: mediaType,
      filename: input.originalFilename,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      size: input.data.length,
      caption: input.caption ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      date: mediaDate,
      placeId: input.placeId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(media).where(eq(media.id, id)).get()));
}

/**
 * Get a media record by ID.
 */
export function getMediaById(
  db: BetterSQLite3Database,
  id: string,
): Result<typeof media.$inferSelect> {
  const row = db.select().from(media).where(eq(media.id, id)).get();
  if (!row || row.deletedAt) {
    return err('NOT_FOUND', `Media with id '${id}' not found`, {
      code: 'MEDIA_NOT_FOUND',
    });
  }
  return ok(row);
}

/**
 * Update media metadata.
 */
export function updateMedia(
  db: BetterSQLite3Database,
  id: string,
  input: UpdateMediaInput,
): Result<typeof media.$inferSelect> {
  const existing = db.select().from(media).where(eq(media.id, id)).get();
  if (!existing || existing.deletedAt) {
    return err('NOT_FOUND', `Media with id '${id}' not found`, {
      code: 'MEDIA_NOT_FOUND',
    });
  }

  db.update(media)
    .set({
      ...(input.caption !== undefined && { caption: input.caption }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.placeId !== undefined && { placeId: input.placeId }),
      updatedAt: now(),
    })
    .where(eq(media.id, id))
    .run();

  return ok(mustGet(db.select().from(media).where(eq(media.id, id)).get()));
}

/**
 * List media records with pagination and optional type filter.
 */
export function listMedia(
  db: BetterSQLite3Database,
  opts: ListMediaOptions = {},
): Result<{ media: (typeof media.$inferSelect)[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  let whereClause = isNull(media.deletedAt);
  if (opts.type) {
    whereClause = sql`${media.deletedAt} IS NULL AND ${media.type} = ${opts.type}`;
  }

  const total = countRows(db, media, whereClause);
  const rows = db.select().from(media).where(whereClause).limit(limit).offset(offset).all();

  return ok({ media: rows, total });
}

/**
 * Soft-delete a media record and remove files from storage.
 */
export async function deleteMedia(
  db: BetterSQLite3Database,
  storage: StorageAdapter,
  id: string,
): Promise<Result<void>> {
  const row = db.select().from(media).where(eq(media.id, id)).get();
  if (!row || row.deletedAt) {
    return err('NOT_FOUND', `Media with id '${id}' not found`, {
      code: 'MEDIA_NOT_FOUND',
    });
  }

  // Soft-delete in DB
  db.update(media).set({ deletedAt: now(), updatedAt: now() }).where(eq(media.id, id)).run();

  // Clean up associated media_links (they reference a now-deleted media)
  db.delete(mediaLinks).where(eq(mediaLinks.mediaId, id)).run();

  // Remove files from storage
  await storage.delete(id);

  return ok(undefined);
}

/**
 * Get the thumbnail filename for a media record.
 */
export function getThumbFilename(originalFilename: string): string {
  return thumbFilename(originalFilename);
}
