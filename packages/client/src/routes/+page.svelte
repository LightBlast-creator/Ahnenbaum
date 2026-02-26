<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import PluginSlot from '$lib/plugin-slots/PluginSlot.svelte';
</script>

<svelte:head>
  <title>{m.dashboard_welcome()} | {m.app_title()}</title>
</svelte:head>

<div class="dashboard">
  <section class="dashboard-hero">
    <h1>{m.dashboard_welcome()}</h1>
    <p class="dashboard-subtitle">{m.app_title()}</p>
  </section>

  <section class="dashboard-actions">
    <h2>{m.dashboard_quick_actions()}</h2>
    <div class="action-cards">
      <a href="{base}/persons" class="action-card">
        <span class="action-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
              cx="9"
              cy="7"
              r="4"
            /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
          >
        </span>
        <span class="action-label">{m.dashboard_browse()}</span>
      </a>

      <a href="{base}/tree" class="action-card">
        <span class="action-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><path
              d="M8 8a4 4 0 1 1 8 0"
            /></svg
          >
        </span>
        <span class="action-label">{m.dashboard_view_tree()}</span>
      </a>
    </div>
  </section>

  <section class="dashboard-plugins">
    <PluginSlot slot="dashboard.widget" />
  </section>
</div>

<style>
  .dashboard {
    max-width: 800px;
    margin: 0 auto;
  }

  .dashboard-hero {
    text-align: center;
    padding: var(--space-16) 0 var(--space-8);
  }

  .dashboard-hero h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dashboard-subtitle {
    margin-top: var(--space-2);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  .dashboard-actions {
    padding: var(--space-6) 0;
  }

  .dashboard-actions h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-4);
  }

  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-base);
  }

  .action-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--color-primary-light);
    border-radius: var(--radius-xl);
    color: var(--color-primary);
  }

  .action-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }
</style>
