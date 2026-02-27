/**
 * Shared database helpers — timestamp and ID generation.
 *
 * Used by all services to avoid duplicating these one-liners.
 */

/** ISO 8601 timestamp for the current instant. */
export function now(): string {
  return new Date().toISOString();
}

/** Cryptographically random UUID v4. */
export function uuid(): string {
  return crypto.randomUUID();
}
