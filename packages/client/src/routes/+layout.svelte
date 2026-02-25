<script lang="ts">
  import '$lib/styles/global.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Header from '$lib/components/Header.svelte';
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
  import AddPersonModal from '$lib/components/AddPersonModal.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ShortcutOverlay from '$lib/components/ShortcutOverlay.svelte';

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

<div class="app-layout">
  <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

  <div class="app-main">
    <Header onSearchClick={handleSearchClick} onAddPerson={handleAddPerson} />

    <main class="app-content">
      <Breadcrumbs />
      {@render children()}
    </main>
  </div>
</div>

<AddPersonModal bind:open={showAddPerson} />
<CommandPalette bind:open={showSearch} />
<ShortcutOverlay bind:open={showShortcuts} />
