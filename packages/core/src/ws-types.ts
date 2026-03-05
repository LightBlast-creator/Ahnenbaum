/**
 * WebSocket message types — shared contract between server and client.
 *
 * The WS channel is notification-only: all data mutations go through REST.
 * These messages tell connected clients what changed so they can re-fetch.
 */

// ── Message envelope ─────────────────────────────────────────────────

export interface WsMessage<T = unknown> {
  /** Event type, e.g. 'person.created', 'presence.join' */
  type: string;
  /** Event-specific data */
  payload: T;
  /** ISO 8601 timestamp of when the event occurred on the server */
  timestamp: string;
  /** Session userId of the user who triggered the event (clients skip own events) */
  senderId?: string;
}

// ── Presence types ───────────────────────────────────────────────────

export interface PresenceUser {
  /** Unique ID per connection (not per user — same user can have multiple tabs). */
  connectionId: string;
  userId: string;
  connectedAt: string;
}

/** Sent to a newly connected client with the current connection list. */
export interface PresenceListPayload {
  users: PresenceUser[];
}

/** Broadcast when a new connection opens. */
export interface PresenceJoinPayload {
  user: PresenceUser;
}

/** Broadcast when a connection closes. */
export interface PresenceLeavePayload {
  connectionId: string;
}
