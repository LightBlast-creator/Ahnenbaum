/**
 * Plugin manager integration tests.
 */

import { describe, expect, it, vi } from 'vitest';
import { PluginManager } from './plugin-manager';
import { EventBus } from './event-bus';
import { PluginRouteRegistry } from './plugin-route-mount';
import type { AhnenbaumPlugin, PluginContext } from '@ahnenbaum/core';

// Minimal stub raw db — plugin manager only passes it through
const stubRawDb = { prepare: () => ({ all: () => [] }) };

function createManager() {
  const eventBus = new EventBus();
  const routeRegistry = new PluginRouteRegistry();
  const manager = new PluginManager({} as never, stubRawDb as never, eventBus, routeRegistry);
  return { manager, eventBus, routeRegistry };
}

function makePlugin(overrides: Partial<AhnenbaumPlugin> = {}): AhnenbaumPlugin {
  return {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin',
    activate: vi.fn(async () => {}),
    deactivate: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('PluginManager', () => {
  it('activates a plugin and reports it as active', async () => {
    const { manager } = createManager();
    const plugin = makePlugin();

    await manager.activate(plugin);

    expect(plugin.activate).toHaveBeenCalledOnce();
    expect(manager.activeCount()).toBe(1);
  });

  it('provides PluginContext to activate', async () => {
    const { manager } = createManager();
    let receivedCtx: PluginContext | undefined;

    const plugin = makePlugin({
      activate: vi.fn(async (ctx) => {
        receivedCtx = ctx;
      }),
    });

    await manager.activate(plugin);

    expect(receivedCtx).toBeDefined();
    if (!receivedCtx) throw new Error('ctx should be defined');
    expect(receivedCtx.pluginName).toBe('test-plugin');
    expect(typeof receivedCtx.on).toBe('function');
    expect(typeof receivedCtx.emit).toBe('function');
    expect(typeof receivedCtx.getConfig).toBe('function');
    expect(typeof receivedCtx.logger.info).toBe('function');
    expect(typeof receivedCtx.db.query).toBe('function');
  });

  it('emits plugin.activated event', async () => {
    const { manager, eventBus } = createManager();
    const callback = vi.fn();
    eventBus.on('plugin.activated', callback);

    await manager.activate(makePlugin());

    expect(callback).toHaveBeenCalledWith({ pluginName: 'test-plugin' });
  });

  it('deactivates a plugin', async () => {
    const { manager } = createManager();
    const plugin = makePlugin();

    await manager.activate(plugin);
    expect(manager.activeCount()).toBe(1);

    await manager.deactivate('test-plugin');
    expect(manager.activeCount()).toBe(0);
    expect(plugin.deactivate).toHaveBeenCalledOnce();
  });

  it('emits plugin.deactivated event', async () => {
    const { manager, eventBus } = createManager();
    const callback = vi.fn();
    eventBus.on('plugin.deactivated', callback);

    await manager.activate(makePlugin());
    await manager.deactivate('test-plugin');

    expect(callback).toHaveBeenCalledWith({ pluginName: 'test-plugin' });
  });

  it('rejects duplicate plugin names', async () => {
    const { manager } = createManager();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await manager.activate(makePlugin());
    await manager.activate(makePlugin());

    expect(manager.activeCount()).toBe(1);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('marks plugin as failed when activate throws', async () => {
    const { manager } = createManager();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const plugin = makePlugin({
      activate: vi.fn(async () => {
        throw new Error('activation failed');
      }),
    });

    await manager.activate(plugin);

    const meta = manager.get('test-plugin');
    expect(meta?.status).toBe('failed');
    spy.mockRestore();
  });

  it('list() returns metadata for all plugins', async () => {
    const { manager } = createManager();

    await manager.activate(makePlugin({ name: 'plugin-a', version: '1.0.0' }));
    await manager.activate(makePlugin({ name: 'plugin-b', version: '2.0.0' }));

    const list = manager.list();
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.name)).toEqual(['plugin-a', 'plugin-b']);
  });

  it('deactivateAll() shuts down all plugins', async () => {
    const { manager } = createManager();

    await manager.activate(makePlugin({ name: 'a' }));
    await manager.activate(makePlugin({ name: 'b' }));
    await manager.activate(makePlugin({ name: 'c' }));
    expect(manager.activeCount()).toBe(3);

    await manager.deactivateAll();
    expect(manager.activeCount()).toBe(0);
  });

  it('hook subscriptions from activate() are cleaned up on deactivate', async () => {
    const { manager, eventBus } = createManager();
    const hookCallback = vi.fn();

    const plugin = makePlugin({
      activate: vi.fn(async (ctx) => {
        ctx.on('person.created', hookCallback);
      }),
    });

    await manager.activate(plugin);
    eventBus.emit('person.created', { personId: '1', person: {} });
    expect(hookCallback).toHaveBeenCalledOnce();

    await manager.deactivate('test-plugin');
    eventBus.emit('person.created', { personId: '2', person: {} });
    expect(hookCallback).toHaveBeenCalledOnce(); // no extra calls
  });

  it('mounts plugin routes', async () => {
    const { manager, routeRegistry } = createManager();

    const plugin = makePlugin({
      routes: [
        {
          method: 'GET',
          path: '/hello',
          handler: () => new Response('hi'),
        },
      ],
    });

    await manager.activate(plugin);
    const router = routeRegistry.getRouter();
    expect(router).toBeDefined();
  });

  it('getConfig reads scoped env vars', async () => {
    const { manager } = createManager();
    process.env.PLUGIN_TEST_PLUGIN_API_KEY = 'secret';

    let configValue: string | undefined;
    const plugin = makePlugin({
      activate: vi.fn(async (ctx) => {
        configValue = ctx.getConfig('api_key');
      }),
    });

    await manager.activate(plugin);
    expect(configValue).toBe('secret');
    delete process.env.PLUGIN_TEST_PLUGIN_API_KEY;
  });
});
