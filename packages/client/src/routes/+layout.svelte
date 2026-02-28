<script lang="ts">
  import '$lib/styles/global.css';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import AddPersonModal from '$lib/components/AddPersonModal.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ShortcutOverlay from '$lib/components/ShortcutOverlay.svelte';
  import ConnectionBanner from '$lib/components/ConnectionBanner.svelte';

  let { children } = $props();
  let sidebarCollapsed = $state(false);
  let showAddPerson = $state(false);
  let showSearch = $state(false);
  let showShortcuts = $state(false);

  $effect(() => {
    const saved = localStorage.getItem('ahnenbaum-sidebar-collapsed');
    if (saved !== null) {
      sidebarCollapsed = saved === 'true';
    }
  });

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('ahnenbaum-sidebar-collapsed', String(sidebarCollapsed));
  }

  function handleSearchClick() {
    showSearch = true;
  }

  function handleAddPerson() {
    showAddPerson = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only handle Escape within inputs
      if (event.key === 'Escape') {
        showSearch = false;
        showAddPerson = false;
        showShortcuts = false;
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      showSearch = !showSearch;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      showAddPerson = true;
    }

    if (event.key === '?' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      showShortcuts = !showShortcuts;
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<a href="#main-content" class="skip-link">Skip to content</a>

<ConnectionBanner />

<div class="app-layout">
  <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

  <!-- Mobile backdrop -->
  {#if !sidebarCollapsed}
    <button
      class="sidebar-backdrop"
      onclick={toggleSidebar}
      aria-label="Close sidebar"
      tabindex="-1"
    ></button>
  {/if}

  <div class="app-main">
    <Header onSearchClick={handleSearchClick} onAddPerson={handleAddPerson} />

    <main id="main-content" class="app-content">
      <Breadcrumbs />
      {#key page.url.pathname}
        <div class="page-transition" in:fade={{ duration: 150, delay: 50 }}>
          {@render children()}
        </div>
      {/key}
    </main>
  </div>
</div>

<AddPersonModal bind:open={showAddPerson} />
<CommandPalette bind:open={showSearch} />
<ShortcutOverlay bind:open={showShortcuts} />

<style>
  .sidebar-backdrop {
    display: none;
  }

  @media (max-width: 768px) {
    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-overlay) - 1);
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      cursor: default;
    }
  }
</style>
