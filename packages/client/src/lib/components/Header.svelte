<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import PresencePill from '$lib/components/PresencePill.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PrintButton from '$lib/components/PrintButton.svelte';

  let { onSearchClick, onAddPerson }: { onSearchClick: () => void; onAddPerson: () => void } =
    $props();

  let isDark = $state(false);

  // Read initial theme from document once mounted (set by inline script in app.html)

  $effect(() => {
    isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  });

  function toggleTheme() {
    isDark = !isDark;
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ahnenbaum-theme', theme);
  }
</script>

<header class="header">
  <div class="header-left">
    <button class="header-btn add-btn" onclick={onAddPerson} aria-label={m.person_add()}>
      <Icon name="plus" size={18} />
      <span class="btn-label">{m.person_add()}</span>
    </button>
  </div>

  <div class="header-center">
    <button class="search-trigger" onclick={onSearchClick}>
      <Icon name="search" size={16} />
      <span class="search-text">{m.search_placeholder()}</span>
      <kbd class="search-kbd">⌘K</kbd>
    </button>
  </div>

  <div class="header-right">
    <PresencePill />
    <PrintButton />
    <button
      class="header-btn theme-btn"
      onclick={toggleTheme}
      aria-label={isDark ? m.theme_light() : m.theme_dark()}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={18} />
    </button>
  </div>
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--space-4);
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    gap: var(--space-4);
  }

  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .header-center {
    flex: 1;
    max-width: 480px;
  }

  .header-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    font-size: var(--font-size-sm);
  }

  .header-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .add-btn {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .add-btn:hover {
    background: var(--color-primary-hover);
    color: var(--color-text-inverse);
  }

  .search-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .search-trigger:hover {
    border-color: var(--color-border-hover);
    background: var(--color-surface);
  }

  .search-text {
    flex: 1;
    text-align: left;
  }

  .search-kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: 2px var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  .btn-label {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .btn-label {
      display: none;
    }

    .search-text {
      display: none;
    }

    .search-kbd {
      display: none;
    }
  }
</style>
