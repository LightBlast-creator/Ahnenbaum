<script lang="ts">
  /**
   * PluginPanel — wrapper for a single plugin-provided panel.
   *
   * Provides a subtle header with the panel label, collapse/expand,
   * and an error boundary fallback.
   */
  import type { PanelDefinition } from '@ahnenbaum/core';
  import type { Snippet } from 'svelte';

  interface Props {
    panel: PanelDefinition;
    context?: Record<string, unknown>;
    children?: Snippet;
  }

  let { panel, context: _context = {}, children }: Props = $props();
  let collapsed = $state(false);
  let hasError = $state(false);
</script>

<div class="plugin-panel" class:collapsed>
  <button class="plugin-panel-header" onclick={() => (collapsed = !collapsed)}>
    {#if panel.icon}
      <span class="panel-icon">{panel.icon}</span>
    {/if}
    <span class="panel-label">{panel.label}</span>
    <span class="panel-toggle">{collapsed ? '▸' : '▾'}</span>
  </button>

  {#if !collapsed}
    <div class="plugin-panel-content">
      {#if hasError}
        <div class="plugin-error">
          <p>⚠️ Plugin panel failed to render</p>
          <button onclick={() => (hasError = false)}>Retry</button>
        </div>
      {:else}
        <!-- Plugin component will be dynamically rendered here -->
        <div
          class="plugin-component"
          data-plugin={panel.pluginName}
          data-component={panel.component}
        >
          {#if children}
            {@render children()}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .plugin-panel {
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    margin-bottom: var(--space-3, 12px);
  }

  .plugin-panel-header {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    width: 100%;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    background: var(--color-bg-secondary, #f9fafb);
    border: none;
    cursor: pointer;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-text-secondary, #6b7280);
    transition: background var(--transition-fast, 150ms);
  }

  .plugin-panel-header:hover {
    background: var(--color-bg-tertiary, #f3f4f6);
  }

  .panel-icon {
    font-size: 1rem;
  }

  .panel-label {
    flex: 1;
    text-align: left;
    font-weight: var(--font-weight-medium, 500);
  }

  .panel-toggle {
    font-size: 10px;
    color: var(--color-text-muted, #9ca3af);
  }

  .plugin-panel-content {
    padding: var(--space-3, 12px);
  }

  .plugin-error {
    text-align: center;
    padding: var(--space-4, 16px);
    color: var(--color-text-muted, #9ca3af);
    font-size: var(--font-size-sm, 14px);
  }

  .plugin-error button {
    margin-top: var(--space-2, 8px);
    padding: var(--space-1, 4px) var(--space-3, 12px);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-md, 8px);
    background: transparent;
    cursor: pointer;
    font-size: var(--font-size-xs, 12px);
  }

  .collapsed .plugin-panel-content {
    display: none;
  }
</style>
