/**
 * Plugin API barrel — re-exports all plugin types.
 *
 * Import from '@ahnenbaum/core' (the package barrel), not this file directly.
 */

export type { AhnenbaumPlugin, PluginMetadata, PluginStatus } from './plugin-types';

export type { PluginContext, PluginLogger } from './plugin-context';

export type { HookName, HookPayloads, HookRegistration, Disposable } from './hooks';

export type { RouteDefinition, RouteMethod } from './routes';

export type { PanelSlot, PanelDefinition } from './panels';

export type { SchemaExtension } from './schemas';
