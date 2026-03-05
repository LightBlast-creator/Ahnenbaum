/**
 * WebSocket hub — manages connected WebSocket clients and broadcasts messages.
 *
 * Responsibilities:
 *   - Track connected clients with their session metadata
 *   - Broadcast messages to all (or all-but-sender) clients
 *   - Heartbeat ping/pong to detect dead connections
 *   - Presence tracking (join/leave announcements)
 */

import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  WsMessage,
  PresenceUser,
  PresenceListPayload,
  PresenceJoinPayload,
  PresenceLeavePayload,
} from '@ahnenbaum/core';

interface ClientMeta {
  connectionId: string;
  userId: string;
  connectedAt: string;
  alive: boolean;
}

export class WsHub {
  private clients = new Map<WebSocket, ClientMeta>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private static HEARTBEAT_INTERVAL_MS = 30_000;

  /** Start the heartbeat timer. Call once after creating the hub. */
  start(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => this.heartbeat(), WsHub.HEARTBEAT_INTERVAL_MS);
  }

  /** Stop the heartbeat timer and close all connections. */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const ws of this.clients.keys()) {
      try {
        ws.close(1001, 'Server shutting down');
      } catch {
        // Already closed
      }
    }
    this.clients.clear();
  }

  /** Handle a new WebSocket connection. */
  handleConnection(ws: WebSocket, userId: string): void {
    const meta: ClientMeta = {
      connectionId: randomUUID(),
      userId,
      connectedAt: new Date().toISOString(),
      alive: true,
    };
    this.clients.set(ws, meta);

    // Wire up pong handler for heartbeat
    ws.on('pong', () => {
      const m = this.clients.get(ws);
      if (m) m.alive = true;
    });

    // Send the new client the current presence list
    const users = this.getPresenceList();
    this.sendTo(ws, {
      type: 'presence.list',
      payload: { users } satisfies PresenceListPayload,
      timestamp: new Date().toISOString(),
    });

    // Broadcast join to everyone else
    this.broadcast(
      {
        type: 'presence.join',
        payload: {
          user: {
            connectionId: meta.connectionId,
            userId: meta.userId,
            connectedAt: meta.connectedAt,
          },
        } satisfies PresenceJoinPayload,
        timestamp: new Date().toISOString(),
      },
      ws,
    );

    console.info(
      `[WsHub] Client connected: ${userId} [${meta.connectionId.slice(0, 8)}] (${this.clients.size} total)`,
    );
  }

  /** Handle a client disconnecting. */
  handleDisconnect(ws: WebSocket): void {
    const meta = this.clients.get(ws);
    if (!meta) return;

    this.clients.delete(ws);

    this.broadcast({
      type: 'presence.leave',
      payload: { connectionId: meta.connectionId } satisfies PresenceLeavePayload,
      timestamp: new Date().toISOString(),
    });

    console.info(
      `[WsHub] Client disconnected: ${meta.userId} [${meta.connectionId.slice(0, 8)}] (${this.clients.size} total)`,
    );
  }

  /**
   * Broadcast a message to all connected clients.
   * Optionally exclude one socket (typically the sender).
   */
  broadcast(message: WsMessage, exclude?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.clients) {
      if (ws === exclude) continue;
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    }
  }

  /** Get the current list of connected users. */
  getPresenceList(): PresenceUser[] {
    const users: PresenceUser[] = [];
    for (const meta of this.clients.values()) {
      users.push({
        connectionId: meta.connectionId,
        userId: meta.userId,
        connectedAt: meta.connectedAt,
      });
    }
    return users;
  }

  /** Number of connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  // ── Internal ────────────────────────────────────────────────────────

  private sendTo(ws: WebSocket, message: WsMessage): void {
    if (ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(JSON.stringify(message));
    }
  }

  private heartbeat(): void {
    for (const [ws, meta] of this.clients) {
      if (!meta.alive) {
        // Didn't respond to last ping — terminate
        console.info(`[WsHub] Terminating unresponsive client: ${meta.userId}`);
        ws.terminate();
        this.handleDisconnect(ws);
        continue;
      }
      meta.alive = false;
      ws.ping();
    }
  }
}
