/**
 * Backup scheduler — automated SQLite database backups.
 *
 * Uses better-sqlite3's .backup() API for consistent snapshots.
 * Configurable interval and retention count via environment variables.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';
import { createLogger } from '../logging/logger';

const logger = createLogger('backup');

const BACKUP_DIR = resolve('data/backups');
const INTERVAL_HOURS = Number(process.env.BACKUP_INTERVAL_HOURS) || 24;
const RETAIN_COUNT = Number(process.env.BACKUP_RETAIN_COUNT) || 7;

export class BackupScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly sqlite: BetterSqlite3.Database;

  constructor(sqlite: BetterSqlite3.Database) {
    this.sqlite = sqlite;
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  /**
   * Start the backup scheduler.
   */
  start(): void {
    // Run initial backup after a short delay
    setTimeout(() => {
      this.runBackup().catch((err) => {
        logger.error('Backup failed (initial)', { error: String(err) });
      });
    }, 5000);

    this.timer = setInterval(
      () => {
        this.runBackup().catch((err) => {
          logger.error('Backup failed (scheduled)', { error: String(err) });
        });
      },
      INTERVAL_HOURS * 60 * 60 * 1000,
    );

    logger.info(`Backup scheduler started`, {
      interval_hours: INTERVAL_HOURS,
      retain_count: RETAIN_COUNT,
      backup_dir: BACKUP_DIR,
    });
  }

  /**
   * Stop the backup scheduler.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Run a single backup.
   */
  async runBackup(): Promise<string | null> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ahnenbaum-${timestamp}.db`;
    const backupPath = join(BACKUP_DIR, filename);

    try {
      await this.sqlite.backup(backupPath);
      logger.info(`Backup created: ${filename}`);
      this.cleanup();
      return backupPath;
    } catch (err) {
      logger.error('Backup failed', { error: String(err) });
      return null;
    }
  }

  /**
   * Remove old backups beyond retention count.
   */
  private cleanup(): void {
    if (!existsSync(BACKUP_DIR)) return;

    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('ahnenbaum-') && f.endsWith('.db'))
      .sort()
      .reverse();

    const toDelete = files.slice(RETAIN_COUNT);
    for (const file of toDelete) {
      try {
        unlinkSync(join(BACKUP_DIR, file));
        logger.info(`Deleted old backup: ${file}`);
      } catch (err) {
        logger.warn(`Failed to delete backup ${file}`, { error: String(err) });
      }
    }
  }
}
