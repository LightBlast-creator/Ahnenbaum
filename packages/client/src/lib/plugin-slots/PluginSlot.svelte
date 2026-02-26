<script lang="ts">
  /**
   * PluginSlot — renders all panels registered for a specific slot.
   *
   * Empty slots render nothing (no extra DOM). Each panel is wrapped
   * in an error boundary to prevent one bad plugin from crashing others.
   */
  import { getPanelsForSlot } from '$lib/plugin-slots/plugin-registry';
  import PluginPanel from '$lib/components/PluginPanel.svelte';
  import type { PanelSlot } from '@ahnenbaum/core';

  interface Props {
    slot: PanelSlot;
    context?: Record<string, unknown>;
  }

  let { slot, context = {} }: Props = $props();

  // Use $derived to reactively track the slot prop, then create a derived store
  const panels = $derived(getPanelsForSlot(slot));
</script>

{#each $panels as panel (panel.pluginName + panel.component)}
  <PluginPanel {panel} {context} />
{/each}
