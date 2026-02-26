/**
 * Plugin registry — reactive Svelte store for plugin panel registrations.
 *
 * Populated from GET /api/plugins on app boot.
 * Used by <PluginSlot> to query registered panels for each slot.
 */

import { writable, derived, type Readable } from 'svelte/store';
import type { PanelDefinition, PanelSlot, PluginMetadata } from '@ahnenbaum/core';

// ── Store ────────────────────────────────────────────────────────────

const panelStore = writable<PanelDefinition[]>([]);

/**
 * Initialize the plugin registry from server data.
 * Called once on app boot.
 */
export async function initPluginRegistry(): Promise<void> {
  try {
    const res = await fetch('/api/plugins');
    const json = (await res.json()) as { ok: boolean; data: PluginMetadata[] };
    if (!json.ok) return;

    const allPanels: PanelDefinition[] = [];
    for (const plugin of json.data) {
      if (plugin.panels) {
        for (const panel of plugin.panels) {
          allPanels.push({ ...panel, pluginName: plugin.name });
        }
      }
    }

    panelStore.set(allPanels);
  } catch {
    // Server not available (dev mode, SSR) — fail silently
  }
}

/**
 * Get panels registered for a specific slot.
 *
 * Returns a derived readable store that updates reactively.
 */
export function getPanelsForSlot(slot: PanelSlot): Readable<PanelDefinition[]> {
  return derived(panelStore, ($panels) =>
    $panels.filter((p) => p.slot === slot).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  );
}

/**
 * Register a panel manually (for client-side plugins).
 */
export function registerPanel(panel: PanelDefinition): void {
  panelStore.update((panels) => [...panels, panel]);
}

/**
 * Unregister all panels for a specific plugin.
 */
export function unregisterPlugin(pluginName: string): void {
  panelStore.update((panels) => panels.filter((p) => p.pluginName !== pluginName));
}

/**
 * Get all registered panels (readable store).
 */
export const allPanels: Readable<PanelDefinition[]> = { subscribe: panelStore.subscribe };
