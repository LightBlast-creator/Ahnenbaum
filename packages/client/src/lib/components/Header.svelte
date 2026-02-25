<script lang="ts">
  import * as m from '$lib/paraglide/messages';

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
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      <span class="btn-label">{m.person_add()}</span>
    </button>
  </div>

  <div class="header-center">
    <button class="search-trigger" onclick={onSearchClick}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span class="search-text">{m.search_placeholder()}</span>
      <kbd class="search-kbd">⌘K</kbd>
    </button>
  </div>

  <div class="header-right">
    <button
      class="header-btn theme-btn"
      onclick={toggleTheme}
      aria-label={isDark ? m.theme_light() : m.theme_dark()}
    >
      {#if isDark}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      {:else}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      {/if}
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
