/**
 * Media service integration tests.
 *
 * Uses an in-memory SQLite database with schema applied via migrate().
 * Mocks storage and sharp/exifr for isolated testing.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as mediaService from './media-service';
import type { StorageAdapter } from '../storage/local-storage';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

/**
 * In-memory mock storage adapter for testing.
 */
function createMockStorage(): StorageAdapter {
  const files = new Map<string, Buffer>();

  return {
    async save(id: string, filename: string, data: Buffer) {
      files.set(`${id}/${filename}`, data);
    },
    async get(id: string, filename: string) {
      return files.get(`${id}/${filename}`) ?? null;
    },
    async delete(id: string) {
      for (const key of files.keys()) {
        if (key.startsWith(`${id}/`)) files.delete(key);
      }
    },
    getPath(id: string, filename: string) {
      return `mock://${id}/${filename}`;
    },
    async exists(id: string, filename: string) {
      return files.has(`${id}/${filename}`);
    },
  };
}

/** Create a small valid JPEG buffer (1x1 pixel). */
function createMinimalJpeg(): Buffer {
  // Minimal valid JPEG: SOI + APP0 JFIF header + single pixel + EOI
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

describe('mediaService', () => {
  let db: BetterSQLite3Database;
  let storage: StorageAdapter;

  beforeEach(() => {
    db = createTestDb();
    storage = createMockStorage();
  });

  // ── uploadMedia ───────────────────────────────────────────────────

  it('uploads an image file and creates a database record', async () => {
    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'photo.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.type).toBe('image');
    expect(result.data.originalFilename).toBe('photo.jpg');
    expect(result.data.mimeType).toBe('image/jpeg');
    expect(result.data.size).toBeGreaterThan(0);
    expect(result.data.id).toBeTruthy();
  });

  it('uploads a PDF file', async () => {
    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'document.pdf',
      mimeType: 'application/pdf',
      data: Buffer.from('%PDF-1.4 minimal content'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.type).toBe('pdf');
  });

  it('rejects unsupported file types', async () => {
    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'script.exe',
      mimeType: 'application/x-executable',
      data: Buffer.from('malicious'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details?.code).toBe('MEDIA_TYPE_UNSUPPORTED');
  });

  it('rejects files exceeding max size', async () => {
    const result = await mediaService.uploadMedia(
      db,
      storage,
      {
        originalFilename: 'huge.jpg',
        mimeType: 'image/jpeg',
        data: Buffer.alloc(100),
      },
      50, // 50 bytes max
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details?.code).toBe('MEDIA_SIZE_EXCEEDED');
  });

  it('saves file to storage', async () => {
    const data = createMinimalJpeg();
    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      data,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await storage.get(result.data.id, 'test.jpg');
    expect(stored).not.toBeNull();
    expect(stored?.length).toBe(data.length);
  });

  it('stores user-provided metadata (caption, description, date)', async () => {
    const result = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'family.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
      caption: 'Family reunion 2020',
      description: 'Annual gathering',
      notes: 'Some interesting details',
      date: '2020-07-15',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.caption).toBe('Family reunion 2020');
    expect(result.data.description).toBe('Annual gathering');
    expect(result.data.notes).toBe('Some interesting details');
    expect(result.data.date).toBe('2020-07-15');
  });

  // ── getMediaById ──────────────────────────────────────────────────

  it('retrieves a media record by ID', async () => {
    const uploaded = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
    });
    if (!uploaded.ok) throw new Error('setup failed');

    const result = mediaService.getMediaById(db, uploaded.data.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe(uploaded.data.id);
  });

  it('returns NOT_FOUND for missing media', () => {
    const result = mediaService.getMediaById(db, 'nonexistent');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── listMedia ─────────────────────────────────────────────────────

  it('lists media with pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await mediaService.uploadMedia(db, storage, {
        originalFilename: `photo${i}.jpg`,
        mimeType: 'image/jpeg',
        data: createMinimalJpeg(),
      });
    }

    const page1 = mediaService.listMedia(db, { page: 1, limit: 2 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.data.media).toHaveLength(2);
    expect(page1.data.total).toBe(5);
  });

  it('filters media by type', async () => {
    await mediaService.uploadMedia(db, storage, {
      originalFilename: 'photo.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
    });
    await mediaService.uploadMedia(db, storage, {
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      data: Buffer.from('%PDF'),
    });

    const images = mediaService.listMedia(db, { type: 'image' });
    expect(images.ok).toBe(true);
    if (!images.ok) return;
    expect(images.data.total).toBe(1);
    expect(images.data.media[0].type).toBe('image');
  });

  // ── deleteMedia ───────────────────────────────────────────────────

  it('soft-deletes a media record', async () => {
    const uploaded = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'delete-me.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
    });
    if (!uploaded.ok) throw new Error('setup failed');

    const del = await mediaService.deleteMedia(db, storage, uploaded.data.id);
    expect(del.ok).toBe(true);

    // Should no longer be findable
    const find = mediaService.getMediaById(db, uploaded.data.id);
    expect(find.ok).toBe(false);
    if (find.ok) return;
    expect(find.error.code).toBe('NOT_FOUND');
  });

  it('returns NOT_FOUND when deleting nonexistent media', async () => {
    const result = await mediaService.deleteMedia(db, storage, 'missing');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── updateMedia ───────────────────────────────────────────────────

  it('updates media metadata', async () => {
    const uploaded = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
      caption: 'Old caption',
    });
    if (!uploaded.ok) throw new Error('setup failed');

    const result = mediaService.updateMedia(db, uploaded.data.id, {
      caption: 'New caption',
      notes: 'New notes',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.caption).toBe('New caption');
    expect(result.data.notes).toBe('New notes');
  });

  it('partially updates media without overwriting other fields', async () => {
    const uploaded = await mediaService.uploadMedia(db, storage, {
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      data: createMinimalJpeg(),
      caption: 'Initial caption',
      description: 'Initial description',
    });
    if (!uploaded.ok) throw new Error('setup failed');

    const result = mediaService.updateMedia(db, uploaded.data.id, {
      notes: 'Only updating notes',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.caption).toBe('Initial caption'); // unchanged
    expect(result.data.description).toBe('Initial description'); // unchanged
    expect(result.data.notes).toBe('Only updating notes');
  });

  it('updateMedia returns NOT_FOUND for missing media', () => {
    const result = mediaService.updateMedia(db, 'nonexistent', { caption: 'Test' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FOUND');
  });

  // ── getThumbFilename ──────────────────────────────────────────────

  it('generates correct thumbnail filenames', () => {
    expect(mediaService.getThumbFilename('photo.jpg')).toBe('thumb_photo.webp');
    expect(mediaService.getThumbFilename('my-file.png')).toBe('thumb_my-file.webp');
    expect(mediaService.getThumbFilename('noext')).toBe('thumb_noext.webp');
  });
});
