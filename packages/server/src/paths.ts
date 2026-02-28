/**
 * Centralized data path resolution.
 *
 * All persistent state (database, media, backups, logs, secrets) lives
 * under a single DATA_DIR root. Configure via `DATA_DIR` env var; defaults
 * to `data/` relative to CWD for local development.
 */

import { resolve, join } from 'node:path';
import { mkdirSync } from 'node:fs';

/** Root data directory — all persistent state lives here. */
export const DATA_DIR = resolve(process.env.DATA_DIR ?? 'data');

export const MEDIA_DIR = join(DATA_DIR, 'media');
export const BACKUP_DIR = join(DATA_DIR, 'backups');
export const LOG_DIR = join(DATA_DIR, 'logs');
export const SESSION_SECRET_PATH = join(DATA_DIR, '.session-secret');

/** Ensure all data directories exist at boot. */
export function ensureDataDirs(): void {
  for (const dir of [DATA_DIR, MEDIA_DIR, BACKUP_DIR, LOG_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
}
