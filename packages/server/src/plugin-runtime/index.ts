/**
 * Plugin runtime barrel — re-exports for use by server entry point and app factory.
 */

export { EventBus } from './event-bus.ts';
export { discoverPlugins, type LoadedPlugin } from './plugin-loader.ts';
export { PluginManager } from './plugin-manager.ts';
export { PluginRouteRegistry, createPluginRouter } from './plugin-route-mount.ts';
