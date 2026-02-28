/**
 * Structured JSON logger.
 *
 * Output format: JSON in production, pretty-printed in development.
 * In production, log entries are also persisted to rotating log files.
 * Configurable via LOG_LEVEL env var.
 */

import { appendFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { LOG_DIR } from '../paths';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  service: 'ahnenbaum';
  module?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_PRIORITY) return raw as LogLevel;
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

const isDev = process.env.NODE_ENV !== 'production';

// ── File transport (production only) ────────────────────────────────
const LOG_FILE = join(LOG_DIR, 'ahnenbaum.log');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_ROTATED_FILES = 5;
const ROTATION_CHECK_INTERVAL = 100; // check file size every N writes

let writeCount = 0;

/**
 * Rotate log files when the current file exceeds MAX_FILE_SIZE.
 * Shifts ahnenbaum.log → .log.1 → .log.2 … → .log.N (oldest deleted).
 */
function rotateIfNeeded(): void {
  try {
    const stats = statSync(LOG_FILE);
    if (stats.size < MAX_FILE_SIZE) return;

    // Delete oldest rotated file
    const oldest = `${LOG_FILE}.${MAX_ROTATED_FILES}`;
    try {
      unlinkSync(oldest);
    } catch {
      // May not exist — fine
    }

    // Shift existing rotated files up by one
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      try {
        renameSync(`${LOG_FILE}.${i}`, `${LOG_FILE}.${i + 1}`);
      } catch {
        // May not exist — fine
      }
    }

    // Rotate current → .1
    renameSync(LOG_FILE, `${LOG_FILE}.1`);
  } catch {
    // File may not exist yet or stat failed — skip rotation
  }
}

/**
 * Append a JSON log line to the persistent log file.
 * Never throws — file transport failures are silently ignored.
 */
function writeToFile(entry: LogEntry): void {
  if (isDev) return;

  try {
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

    writeCount++;
    if (writeCount >= ROTATION_CHECK_INTERVAL) {
      writeCount = 0;
      rotateIfNeeded();
    }
  } catch {
    // Silent — log file issues must never crash the server
  }
}

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const prefix = entry.module ? `[${entry.module}]` : '';
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[90m',
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    };
    const reset = '\x1b[0m';
    return `${levelColors[entry.level]}${entry.level.toUpperCase().padEnd(5)}${reset} ${prefix} ${entry.message}${ctx}`;
  }
  return JSON.stringify(entry);
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  module?: string,
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    service: 'ahnenbaum',
    module,
  };

  // Stdout/stderr (always)
  const formatted = formatEntry(entry);
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      console.debug(formatted);
      break;
    default:
      console.info(formatted);
  }

  // Persistent file (production only)
  writeToFile(entry);
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Create a scoped logger.
 */
export function createLogger(module?: string): Logger {
  return {
    debug: (msg, ctx) => log('debug', msg, ctx, module),
    info: (msg, ctx) => log('info', msg, ctx, module),
    warn: (msg, ctx) => log('warn', msg, ctx, module),
    error: (msg, ctx) => log('error', msg, ctx, module),
  };
}
