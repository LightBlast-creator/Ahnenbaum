<script lang="ts">
  /**
   * PluginNav — renders plugin-provided navigation items in the sidebar.
   */
  import { getPanelsForSlot } from '$lib/plugin-slots/plugin-registry';

  const navItems = getPanelsForSlot('navigation.item');
</script>

{#if $navItems.length > 0}
  <div class="plugin-nav">
    <div class="plugin-nav-divider"></div>
    {#each $navItems as item (item.pluginName + item.component)}
      <a href="/plugins/{item.pluginName}" class="plugin-nav-item">
        {#if item.icon}
          <span class="nav-icon">{item.icon}</span>
        {/if}
        <span class="nav-label">{item.label}</span>
      </a>
    {/each}
  </div>
{/if}

<style>
  .plugin-nav-divider {
    margin: var(--space-2, 8px) var(--space-3, 12px);
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .plugin-nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    color: var(--color-text-secondary, #6b7280);
    text-decoration: none;
    font-size: var(--font-size-sm, 14px);
    border-radius: var(--radius-md, 8px);
    transition: all var(--transition-fast, 150ms);
  }

  .plugin-nav-item:hover {
    background: var(--color-bg-secondary, #f9fafb);
    color: var(--color-text, #111827);
  }

  .nav-icon {
    font-size: 1rem;
  }

  .nav-label {
    font-weight: var(--font-weight-medium, 500);
  }
</style>
