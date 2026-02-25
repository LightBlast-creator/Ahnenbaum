/**
 * Storage abstraction — pluggable file storage for media uploads.
 *
 * Default implementation: local filesystem (`data/media/`).
 * Designed so `S3StorageAdapter` can be added later as a plugin
 * without touching existing code.
 */

import { mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ── Interface ────────────────────────────────────────────────────────

/** Abstraction for persisting media files. */
export interface StorageAdapter {
  /**
   * Save a file to storage.
   * @param id      Unique media ID (used as directory name)
   * @param filename  Target filename within the media directory
   * @param data      File content as a Buffer
   */
  save(id: string, filename: string, data: Buffer): Promise<void>;

  /**
   * Read a file from storage.
   * @returns File data as Buffer, or null if not found
   */
  get(id: string, filename: string): Promise<Buffer | null>;

  /**
   * Delete all files for a given media ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Get the absolute filesystem path (local-only; S3 returns a URL instead).
   */
  getPath(id: string, filename: string): string;

  /**
   * Check whether a file exists.
   */
  exists(id: string, filename: string): Promise<boolean>;
}

// ── Local filesystem implementation ──────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {
  private readonly basePath: string;

  /**
   * @param basePath  Root directory for media files, e.g. `data/media`.
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async save(id: string, filename: string, data: Buffer): Promise<void> {
    const safeName = sanitizeFilename(filename);
    const filePath = this.getPath(id, safeName);
    const dir = join(this.basePath, id);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, data);
  }

  async get(id: string, filename: string): Promise<Buffer | null> {
    const filePath = this.getPath(id, filename);
    try {
      return await readFile(filePath);
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const dirPath = join(this.basePath, id);
    try {
      await rm(dirPath, { recursive: true, force: true });
    } catch {
      // Directory may not exist — that's fine
    }
  }

  getPath(id: string, filename: string): string {
    return join(this.basePath, id, sanitizeFilename(filename));
  }

  async exists(id: string, filename: string): Promise<boolean> {
    try {
      await stat(this.getPath(id, filename));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a LocalStorageAdapter with the default data/media path.
 * Ensures the base directory exists.
 */
export function createLocalStorage(basePath = 'data/media'): LocalStorageAdapter {
  if (!existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }
  return new LocalStorageAdapter(basePath);
}

/**
 * Strip path separators and dangerous characters from user-provided filenames.
 * Prevents path traversal (e.g., `../../etc/passwd`).
 */
function sanitizeFilename(filename: string): string {
  // Use basename to strip any directory components
  const base = basename(filename);
  // Remove control characters (0x00-0x1f) that could cause issues
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\x00-\x1f]/g, '_') || 'unnamed';
}
