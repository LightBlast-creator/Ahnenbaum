/**
 * Connection status module — tracks server availability.
 *
 * Exports a reactive store for UI consumption and functions
 * for the API client to signal connectivity changes.
 */

import { writable, derived, get } from 'svelte/store';

// ── Types ───────────────────────────────────────────────────────────

export type ConnectionState = 'online' | 'reconnecting' | 'offline';

// ── Store ───────────────────────────────────────────────────────────

const _status = writable<ConnectionState>('online');

/** Reactive connection status. Subscribe in components. */
export const connectionStatus = { subscribe: _status.subscribe };

/** True when the connection is anything other than 'online'. */
export const isDisconnected = derived(_status, (s) => s !== 'online');

// ── Internal state ──────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let disconnectedAt: number | null = null;

const POLL_INTERVAL_MS = 5_000;
const OFFLINE_THRESHOLD_MS = 30_000;
const DEBOUNCE_MS = 2_000;

// ── Public API ──────────────────────────────────────────────────────

/**
 * Signal that a network request failed.
 * Starts health polling if not already running.
 * Debounces the 'reconnecting' state to avoid flicker.
 */
export function markDisconnected(): void {
  if (pollTimer) return; // singleton guard — already polling

  disconnectedAt = Date.now();

  // Debounce: only show 'reconnecting' after 2s of sustained failure
  debounceTimer = setTimeout(() => {
    _status.set('reconnecting');
    debounceTimer = null;
  }, DEBOUNCE_MS);

  startPolling();
}

/**
 * Signal that a network request succeeded.
 * Clears any polling and resets status.
 */
export function markOnline(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  stopPolling();

  // Only fire 'online' if we were disconnected (avoids unnecessary updates)
  if (get(_status) !== 'online') {
    _status.set('online');
  }

  disconnectedAt = null;
}

// ── Health poller ───────────────────────────────────────────────────

function startPolling(): void {
  if (pollTimer) return;

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/health', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(4_000),
      });
      if (res.ok) {
        markOnline();
      }
    } catch {
      // Still down — check if we've crossed the offline threshold
      if (disconnectedAt && Date.now() - disconnectedAt >= OFFLINE_THRESHOLD_MS) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        _status.set('offline');
      }
    }
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
