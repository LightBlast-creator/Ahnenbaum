/**
 * WebSocket client — manages a persistent connection to the server.
 *
 * Features:
 *   - Auto-reconnect with exponential backoff (1s → 30s cap)
 *   - Tab visibility handling (reconnect on wake)
 *   - Typed event subscription (subscribe/unsubscribe)
 *   - Reactive Svelte stores for status and presence
 *   - Integration with connection.ts health tracking
 */

import { writable, get } from 'svelte/store';
import type { WsMessage, PresenceUser } from '@ahnenbaum/core';

// ── Stores ──────────────────────────────────────────────────────────

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export const wsStatus = writable<WsStatus>('disconnected');
export const onlineUsers = writable<PresenceUser[]>([]);

// ── Subscription system ─────────────────────────────────────────────

type Callback = (message: WsMessage) => void;

const listeners = new Map<string, Set<Callback>>();

/**
 * Subscribe to a specific WS event type.
 * Returns an unsubscribe function.
 */
export function subscribe(type: string, callback: Callback): () => void {
  const set = listeners.get(type) ?? new Set();
  listeners.set(type, set);
  set.add(callback);

  return () => {
    set.delete(callback);
    if (set.size === 0) listeners.delete(type);
  };
}

function dispatch(message: WsMessage): void {
  // Dispatch to type-specific listeners
  const set = listeners.get(message.type);
  if (set) {
    for (const cb of set) {
      try {
        cb(message);
      } catch (err) {
        console.error(`[WS] Error in listener for "${message.type}":`, err);
      }
    }
  }

  // Also dispatch to wildcard listeners
  const wildcardSet = listeners.get('*');
  if (wildcardSet) {
    for (const cb of wildcardSet) {
      try {
        cb(message);
      } catch (err) {
        console.error('[WS] Error in wildcard listener:', err);
      }
    }
  }
}

// ── Connection management ───────────────────────────────────────────

let socket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

function getWsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/ws`;
}

function scheduleReconnect(): void {
  if (intentionalClose) return;
  if (reconnectTimer) return;

  const delay = Math.min(BASE_DELAY_MS * 2 ** reconnectAttempt, MAX_DELAY_MS);
  reconnectAttempt++;

  console.info(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
  wsStatus.set('disconnected');

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

/**
 * Open the WebSocket connection.
 * Safe to call multiple times — only one connection will be active.
 */
export function connect(): void {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  intentionalClose = false;
  wsStatus.set('connecting');

  try {
    socket = new WebSocket(getWsUrl());
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener('open', () => {
    console.info('[WS] Connected');
    wsStatus.set('connected');
    reconnectAttempt = 0;

    // Notify connection module
    import('./connection').then(({ markOnline }) => markOnline()).catch(() => {});
  });

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data as string) as WsMessage;
      handleMessage(message);
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  });

  socket.addEventListener('close', () => {
    socket = null;
    if (!intentionalClose) {
      scheduleReconnect();
    } else {
      wsStatus.set('disconnected');
    }
  });

  socket.addEventListener('error', () => {
    // The 'close' event will fire after 'error', which triggers reconnect
  });
}

/**
 * Disconnect intentionally (e.g. on page unload).
 */
export function disconnect(): void {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close(1000, 'Client disconnected');
    socket = null;
  }
  wsStatus.set('disconnected');
  onlineUsers.set([]);
}

// ── Message handling ────────────────────────────────────────────────

function handleMessage(message: WsMessage): void {
  switch (message.type) {
    case 'presence.list':
      onlineUsers.set((message.payload as { users: PresenceUser[] }).users);
      break;

    case 'presence.join': {
      const joining = (message.payload as { user: PresenceUser }).user;
      onlineUsers.update((users) => [...users, joining]);
      break;
    }

    case 'presence.leave': {
      const leavingConnId = (message.payload as { connectionId: string }).connectionId;
      onlineUsers.update((users) => users.filter((u) => u.connectionId !== leavingConnId));
      break;
    }

    default:
      // Forward all other messages (CRUD events) to subscribers
      dispatch(message);
      break;
  }
}

// ── Visibility change — reconnect on tab wake ───────────────────────

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const status = get(wsStatus);
      if (status === 'disconnected' && !intentionalClose) {
        console.info('[WS] Tab became visible — reconnecting');
        reconnectAttempt = 0;
        connect();
      }
    }
  });
}
