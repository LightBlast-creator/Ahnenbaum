/**
 * Plugin loader — discovers and validates plugins from the filesystem.
 *
 * Scans the plugin directory for subdirectories with index.ts/index.js
 * exports that conform to the AhnenbaumPlugin interface.
 */

import { readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { AhnenbaumPlugin } from '@ahnenbaum/core';

/**
 * Validate that an object conforms to the AhnenbaumPlugin interface.
 */
function isValidPlugin(obj: unknown): obj is AhnenbaumPlugin {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    typeof p.version === 'string' &&
    typeof p.activate === 'function'
  );
}

export interface LoadedPlugin {
  plugin: AhnenbaumPlugin;
  path: string;
}

/**
 * Discover and load plugins from a directory.
 *
 * Each subdirectory is expected to have a default export or `plugin` export
 * that implements AhnenbaumPlugin.
 *
 * Invalid plugins are logged but never crash the server.
 */
export async function discoverPlugins(pluginDir: string): Promise<LoadedPlugin[]> {
  const absDir = resolve(pluginDir);
  const loaded: LoadedPlugin[] = [];

  if (!existsSync(absDir)) {
    console.info(`[PluginLoader] Plugin directory not found: ${absDir} — skipping`);
    return loaded;
  }

  let entries: string[];
  try {
    entries = readdirSync(absDir);
  } catch (err) {
    console.error(`[PluginLoader] Failed to read plugin directory: ${absDir}`, err);
    return loaded;
  }

  for (const entry of entries) {
    const entryPath = join(absDir, entry);

    // Skip non-directories and hidden files
    try {
      if (!statSync(entryPath).isDirectory() || entry.startsWith('.')) continue;
    } catch {
      continue;
    }

    // Skip directories without a src/index or dist/index
    const candidates = [
      join(entryPath, 'src', 'index.ts'),
      join(entryPath, 'src', 'index.js'),
      join(entryPath, 'dist', 'index.js'),
      join(entryPath, 'index.ts'),
      join(entryPath, 'index.js'),
    ];

    const entryFile = candidates.find((c) => existsSync(c));
    if (!entryFile) {
      console.warn(`[PluginLoader] No entry file found in ${entryPath} — skipping`);
      continue;
    }

    try {
      const mod = await import(entryFile);
      const plugin = mod.default ?? mod.plugin;

      if (!isValidPlugin(plugin)) {
        console.warn(
          `[PluginLoader] Invalid plugin contract in ${entry}: ` +
            `missing name, version, or activate()`,
        );
        continue;
      }

      loaded.push({ plugin, path: entryPath });
      console.info(`[PluginLoader] Discovered: ${plugin.name}@${plugin.version}`);
    } catch (err) {
      console.warn(`[PluginLoader] Failed to import ${entry}:`, err);
    }
  }

  return loaded;
}
