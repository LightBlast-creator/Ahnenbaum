/**
 * WsHub unit tests.
 *
 * Uses a minimal mock WebSocket to test broadcast, connect/disconnect,
 * and presence tracking without starting a real server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WsHub } from './ws-hub.ts';
import type { WsMessage } from '@ahnenbaum/core';
import { EventEmitter } from 'node:events';

// ── Mock WebSocket ──────────────────────────────────────────────────

class MockWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  sentMessages: string[] = [];
  terminated = false;

  send(data: string) {
    this.sentMessages.push(data);
  }

  ping() {
    // no-op for testing
  }

  close() {
    this.readyState = 3; // CLOSED
  }

  terminate() {
    this.terminated = true;
    this.readyState = 3;
  }
}

// ── Tests ────────────────────────────────────────────────────────────

describe('WsHub', () => {
  let hub: WsHub;

  beforeEach(() => {
    hub = new WsHub();
  });

  afterEach(() => {
    hub.shutdown();
  });

  it('tracks connected clients', () => {
    const ws = new MockWebSocket();
    hub.handleConnection(ws as never, 'user-1');

    expect(hub.clientCount).toBe(1);
    expect(hub.getPresenceList()).toEqual([
      expect.objectContaining({ userId: 'user-1', connectionId: expect.any(String) }),
    ]);
  });

  it('removes client on disconnect', () => {
    const ws = new MockWebSocket();
    hub.handleConnection(ws as never, 'user-1');
    hub.handleDisconnect(ws as never);

    expect(hub.clientCount).toBe(0);
    expect(hub.getPresenceList()).toEqual([]);
  });

  it('sends presence list to new client on connect', () => {
    // First client
    const ws1 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');

    // Second client should receive the presence list
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws2 as never, 'user-2');

    // ws2 should have received a presence.list message
    const messages = ws2.sentMessages.map((m) => JSON.parse(m) as WsMessage);
    const listMsg = messages.find((m) => m.type === 'presence.list');
    expect(listMsg).toBeDefined();
    const listPayload = listMsg?.payload as { users: unknown[] } | undefined;
    expect(listPayload?.users).toHaveLength(2);
  });

  it('broadcasts presence.join to existing clients', () => {
    const ws1 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    ws1.sentMessages.length = 0; // Clear the presence.list message

    const ws2 = new MockWebSocket();
    hub.handleConnection(ws2 as never, 'user-2');

    // ws1 should have received a presence.join for user-2
    const messages = ws1.sentMessages.map((m) => JSON.parse(m) as WsMessage);
    const joinMsg = messages.find((m) => m.type === 'presence.join');
    expect(joinMsg).toBeDefined();
    const joinPayload = joinMsg?.payload as { user: { userId: string } } | undefined;
    expect(joinPayload?.user.userId).toBe('user-2');
  });

  it('broadcasts presence.leave on disconnect', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    hub.handleConnection(ws2 as never, 'user-2');
    ws1.sentMessages.length = 0;

    hub.handleDisconnect(ws2 as never);

    const messages = ws1.sentMessages.map((m) => JSON.parse(m) as WsMessage);
    const leaveMsg = messages.find((m) => m.type === 'presence.leave');
    expect(leaveMsg).toBeDefined();
    const leavePayload = leaveMsg?.payload as { connectionId: string } | undefined;
    expect(leavePayload?.connectionId).toBeDefined();
  });

  it('tracks same user across multiple tabs independently', () => {
    const tab1 = new MockWebSocket();
    const tab2 = new MockWebSocket();
    hub.handleConnection(tab1 as never, 'default-user');
    hub.handleConnection(tab2 as never, 'default-user');

    expect(hub.clientCount).toBe(2);
    expect(hub.getPresenceList()).toHaveLength(2);

    // Each connection should have a unique connectionId
    const list = hub.getPresenceList();
    expect(list[0].connectionId).not.toBe(list[1].connectionId);

    // Disconnect tab1 — tab2 should remain
    tab2.sentMessages.length = 0;
    hub.handleDisconnect(tab1 as never);

    expect(hub.clientCount).toBe(1);
    expect(hub.getPresenceList()).toHaveLength(1);
    expect(hub.getPresenceList()[0].userId).toBe('default-user');

    // tab2 should have received a leave with tab1's connectionId, not its own
    const leaveMessages = tab2.sentMessages.map((m) => JSON.parse(m) as WsMessage);
    const leaveMsg = leaveMessages.find((m) => m.type === 'presence.leave');
    expect(leaveMsg).toBeDefined();
    const leavePayload = leaveMsg?.payload as { connectionId: string } | undefined;
    expect(leavePayload?.connectionId).toBe(list[0].connectionId);
  });

  it('broadcast sends to all open clients', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    hub.handleConnection(ws2 as never, 'user-2');
    ws1.sentMessages.length = 0;
    ws2.sentMessages.length = 0;

    const msg: WsMessage = {
      type: 'person.created',
      payload: { personId: '123' },
      timestamp: new Date().toISOString(),
    };
    hub.broadcast(msg);

    expect(ws1.sentMessages).toHaveLength(1);
    expect(ws2.sentMessages).toHaveLength(1);
    expect(JSON.parse(ws1.sentMessages[0])).toMatchObject({ type: 'person.created' });
  });

  it('broadcast excludes specified client', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    hub.handleConnection(ws2 as never, 'user-2');
    ws1.sentMessages.length = 0;
    ws2.sentMessages.length = 0;

    const msg: WsMessage = {
      type: 'person.updated',
      payload: { personId: '123' },
      timestamp: new Date().toISOString(),
    };
    hub.broadcast(msg, ws1 as never);

    expect(ws1.sentMessages).toHaveLength(0);
    expect(ws2.sentMessages).toHaveLength(1);
  });

  it('skips closed WebSockets during broadcast', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    hub.handleConnection(ws2 as never, 'user-2');
    ws1.sentMessages.length = 0;
    ws2.sentMessages.length = 0;

    // Simulate ws1 going dead without proper close
    ws1.readyState = 3; // CLOSED

    const msg: WsMessage = {
      type: 'person.deleted',
      payload: { personId: '123' },
      timestamp: new Date().toISOString(),
    };
    hub.broadcast(msg);

    expect(ws1.sentMessages).toHaveLength(0);
    expect(ws2.sentMessages).toHaveLength(1);
  });

  it('shutdown closes all connections and clears state', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    hub.handleConnection(ws1 as never, 'user-1');
    hub.handleConnection(ws2 as never, 'user-2');

    hub.shutdown();

    expect(hub.clientCount).toBe(0);
    expect(ws1.readyState).toBe(3);
    expect(ws2.readyState).toBe(3);
  });

  it('handles duplicate disconnect gracefully', () => {
    const ws = new MockWebSocket();
    hub.handleConnection(ws as never, 'user-1');
    hub.handleDisconnect(ws as never);
    hub.handleDisconnect(ws as never); // second call — should not throw

    expect(hub.clientCount).toBe(0);
  });
});
