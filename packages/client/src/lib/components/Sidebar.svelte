<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { page } from '$app/state';
  import { base } from '$app/paths';

  let { collapsed = false, onToggle }: { collapsed: boolean; onToggle: () => void } = $props();

  const navItems = $derived([
    { href: '/', label: m.nav_home(), icon: 'home' },
    { href: '/persons', label: m.nav_people(), icon: 'users' },
    { href: '/tree', label: m.nav_tree(), icon: 'tree' },
  ]);

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<aside class="sidebar" class:collapsed aria-label="Main navigation">
  <div class="sidebar-header">
    {#if !collapsed}
      <span class="sidebar-logo">🌳</span>
      <span class="sidebar-title">{m.app_title()}</span>
    {:else}
      <span class="sidebar-logo">🌳</span>
    {/if}
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item (item.href)}
      <a
        href="{base}{item.href}"
        class="nav-item"
        class:active={isActive(item.href)}
        aria-current={isActive(item.href) ? 'page' : undefined}
      >
        <span class="nav-icon" aria-hidden="true">
          {#if item.icon === 'home'}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline
                points="9 22 9 12 15 12 15 22"
              /></svg
            >
          {:else if item.icon === 'users'}
            <svg
              width="20"
              height="20"
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
          {:else if item.icon === 'tree'}
            <svg
              width="20"
              height="20"
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
          {/if}
        </span>
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <button
    class="sidebar-toggle"
    onclick={onToggle}
    aria-label={collapsed ? m.sidebar_expand() : m.sidebar_collapse()}
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {#if collapsed}
        <polyline points="9 18 15 12 9 6" />
      {:else}
        <polyline points="15 18 9 12 15 6" />
      {/if}
    </svg>
  </button>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: 100vh;
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    transition: width var(--transition-base);
    overflow: hidden;
    z-index: var(--z-sticky);
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    height: var(--header-height);
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-logo {
    font-size: var(--font-size-xl);
    flex-shrink: 0;
  }

  .sidebar-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    white-space: nowrap;
  }

  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    text-decoration: none;
    white-space: nowrap;
  }

  .nav-item:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .nav-item.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
  }

  .nav-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .nav-label {
    font-size: var(--font-size-sm);
  }

  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-3);
    margin: var(--space-2);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .sidebar-toggle:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      left: 0;
      z-index: var(--z-overlay);
      transform: translateX(-100%);
    }

    .sidebar:not(.collapsed) {
      transform: translateX(0);
      box-shadow: var(--shadow-xl);
    }
  }
</style>
