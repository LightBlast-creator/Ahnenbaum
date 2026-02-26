/**
 * Structured JSON logger.
 *
 * Output format: JSON in production, pretty-printed in development.
 * Configurable via LOG_LEVEL env var.
 */

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
