/**
 * WebSocket invalidation — bumps a global reactive version counter
 * when mutation events arrive over WebSocket.
 *
 * Pages that fetch data in `$effect` blocks should depend on `dataVersion`
 * to automatically re-fetch when another user makes changes:
 *
 *   import { dataVersion } from '$lib/ws-invalidation';
 *   $effect(() => {
 *     void $dataVersion;
 *     loadData();
 *   });
 */

import { writable } from 'svelte/store';
import { subscribe } from './ws';

/** Bumps on every incoming `data.changed` event. Components read this to trigger re-fetches. */
export const dataVersion = writable(0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

/**
 * Start listening for WS data change events and bumping the version counter.
 * Returns a cleanup function.
 */
export function setupWsInvalidation(): () => void {
  const unsub = subscribe('data.changed', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      dataVersion.update((v) => v + 1);
    }, DEBOUNCE_MS);
  });

  return () => {
    unsub();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };
}
