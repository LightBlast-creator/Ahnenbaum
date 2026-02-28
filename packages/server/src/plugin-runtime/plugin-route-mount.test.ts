/**
 * Plugin route mount unit tests.
 */

import { describe, expect, it } from 'vitest';
import { createPluginRouter, PluginRouteRegistry } from './plugin-route-mount';
import type { AhnenbaumPlugin, RouteDefinition } from '@ahnenbaum/core';

function makePlugin(name: string, routes: RouteDefinition[] = []): AhnenbaumPlugin {
  return {
    name,
    version: '1.0.0',
    activate: async () => {},
    routes,
  };
}

describe('createPluginRouter', () => {
  it('returns null for plugin with no routes', () => {
    const plugin = makePlugin('empty');
    expect(createPluginRouter(plugin)).toBeNull();
  });

  it('returns null for plugin with empty routes array', () => {
    const plugin = makePlugin('empty', []);
    expect(createPluginRouter(plugin)).toBeNull();
  });

  it('creates a router from route definitions', async () => {
    const plugin = makePlugin('test', [
      {
        method: 'GET',
        path: '/hello',
        handler: () => new Response('world'),
      },
    ]);

    const router = createPluginRouter(plugin);
    expect(router).not.toBeNull();

    if (!router) throw new Error('Expected router');
    const res = await router.request('/hello');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('world');
  });
});

describe('PluginRouteRegistry', () => {
  it('starts with an empty master router', async () => {
    const registry = new PluginRouteRegistry();
    const router = registry.getRouter();
    const res = await router.request('/anything');
    expect(res.status).toBe(404);
  });

  it('mounts plugin routes', async () => {
    const registry = new PluginRouteRegistry();
    registry.mount('weather', [
      {
        method: 'GET',
        path: '/forecast',
        handler: () => new Response('sunny'),
      },
    ]);

    const router = registry.getRouter();
    const res = await router.request('/weather/forecast');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('sunny');
  });

  it('unmounts plugin routes', async () => {
    const registry = new PluginRouteRegistry();
    registry.mount('temp', [
      {
        method: 'GET',
        path: '/data',
        handler: () => new Response('value'),
      },
    ]);

    registry.unmount('temp');

    const router = registry.getRouter();
    const res = await router.request('/temp/data');
    expect(res.status).toBe(404);
  });

  it('unmount on nonexistent plugin does not throw', () => {
    const registry = new PluginRouteRegistry();
    expect(() => registry.unmount('ghost')).not.toThrow();
  });

  it('mount with empty routes is a no-op', async () => {
    const registry = new PluginRouteRegistry();
    registry.mount('empty', []);

    const router = registry.getRouter();
    const res = await router.request('/empty/something');
    expect(res.status).toBe(404);
  });

  it('supports multiple plugins simultaneously', async () => {
    const registry = new PluginRouteRegistry();
    registry.mount('alpha', [{ method: 'GET', path: '/info', handler: () => new Response('a') }]);
    registry.mount('beta', [{ method: 'GET', path: '/info', handler: () => new Response('b') }]);

    const router = registry.getRouter();
    const resA = await router.request('/alpha/info');
    const resB = await router.request('/beta/info');
    expect(await resA.text()).toBe('a');
    expect(await resB.text()).toBe('b');
  });
});
