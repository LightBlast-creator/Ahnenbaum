/**
 * Plugin runtime barrel — re-exports for use by server entry point and app factory.
 */

export { EventBus } from './event-bus';
export { discoverPlugins, type LoadedPlugin } from './plugin-loader';
export { PluginManager } from './plugin-manager';
export { PluginRouteRegistry, createPluginRouter } from './plugin-route-mount';
