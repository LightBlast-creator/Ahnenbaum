/**
 * Plugin API barrel — re-exports all plugin types.
 *
 * Import from '@ahnenbaum/core' (the package barrel), not this file directly.
 */

export type { AhnenbaumPlugin, PluginMetadata, PluginStatus } from './plugin-types.ts';

export type { PluginContext, PluginLogger } from './plugin-context.ts';

export type { HookName, HookPayloads, HookRegistration, Disposable } from './hooks.ts';

export type { RouteDefinition, RouteMethod } from './routes.ts';

export type { PanelSlot, PanelDefinition } from './panels.ts';

export type { SchemaExtension } from './schemas.ts';
