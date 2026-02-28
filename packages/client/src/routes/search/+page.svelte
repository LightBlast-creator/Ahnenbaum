<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { api } from '$lib/api';
  import Toast from '$lib/components/Toast.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SearchFilters from '$lib/components/search/SearchFilters.svelte';
  import SearchResultCard from '$lib/components/search/SearchResultCard.svelte';

  interface SearchResult {
    type: string;
    id: string;
    title: string;
    snippet: string;
  }

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let total = $state(0);
  let page = $state(1);
  let filterType = $state('');
  let loading = $state(false);
  let facets = $state<Record<string, number>>({});
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Toast
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  const typeLabels: Record<string, () => string> = {
    person: () => m.search_persons(),
    place: () => m.search_places(),
    event: () => m.search_events(),
    source: () => m.search_sources(),
    media: () => m.search_media(),
  };

  const typeIcons: Record<string, string> = {
    person: '👤',
    place: '📍',
    event: '📅',
    source: '📚',
    media: '🖼️',
  };

  async function performSearch() {
    if (!query.trim()) {
      results = [];
      total = 0;
      facets = {};
      return;
    }

    loading = true;
    try {
      const params: Record<string, string | number> = { q: query, page, limit: 20 };
      if (filterType) params.type = filterType;

      const data = await api.get<{
        results: SearchResult[];
        total: number;
        facets: Record<string, number>;
      }>('search', params);
      results = data.results;
      total = data.total;
      facets = data.facets;
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
    loading = false;
  }

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      page = 1;
      performSearch();
    }, 300);
  }

  $effect(() => {
    void page;
    void filterType;
    performSearch();
  });

  function getResultHref(result: SearchResult): string {
    switch (result.type) {
      case 'person':
        return `${base}/persons/${result.id}`;
      case 'place':
      case 'event':
      case 'source':
        // Detail pages not yet implemented — link is a no-op
        return '#';
      case 'media':
        return `/media`;
      default:
        return '#';
    }
  }
</script>

<svelte:head>
  <title>{m.search_title()} | {m.app_title()}</title>
</svelte:head>

<div class="search-page">
  <header class="search-header">
    <h1>{m.search_title()}</h1>
    <div class="search-input-wrapper">
      <svg
        class="search-icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        class="search-input"
        bind:value={query}
        oninput={handleInput}
        placeholder={m.search_placeholder()}
      />
    </div>
  </header>

  <div class="search-layout">
    <SearchFilters
      {facets}
      {filterType}
      {typeLabels}
      {typeIcons}
      onFilterChange={(type) => {
        filterType = type;
        page = 1;
      }}
    />

    <main class="search-results">
      {#if loading}
        <div class="search-loading">Loading…</div>
      {:else if query.trim() && results.length === 0}
        <div class="search-empty">{m.search_no_results()}</div>
      {:else}
        <div class="results-list">
          {#each results as result (result.id)}
            <SearchResultCard {result} {typeIcons} href={getResultHref(result)} />
          {/each}
        </div>

        {#if total > 20}
          <Pagination
            {page}
            totalPages={Math.ceil(total / 20)}
            {total}
            pageSize={20}
            onPageChange={(p) => (page = p)}
          />
        {/if}
      {/if}
    </main>
  </div>
</div>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .search-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: var(--space-6);
  }

  .search-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .search-header h1 {
    font-size: var(--font-size-2xl);
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-4);
    color: var(--color-text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--space-3) var(--space-4) var(--space-3) var(--space-10);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    font-size: var(--font-size-base);
    transition: border-color var(--transition-fast);
  }

  .search-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .search-layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--space-6);
  }

  .search-results {
    min-width: 0;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .search-loading,
  .search-empty {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .search-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
