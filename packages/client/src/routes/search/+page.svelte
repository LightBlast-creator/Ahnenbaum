<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Toast from '$lib/components/Toast.svelte';

  const API_BASE = '/api';

  interface SearchResult {
    type: string;
    id: string;
    title: string;
    snippet: string;
    score: number;
  }

  interface SearchResponse {
    results: SearchResult[];
    total: number;
    facets: Record<string, number>;
  }

  let query = $state('');
  let filterType = $state('');
  let results = $state<SearchResult[]>([]);
  let total = $state(0);
  let facets = $state<Record<string, number>>({});
  let loading = $state(false);
  let page = $state(1);
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

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
      let url = `${API_BASE}/search?q=${encodeURIComponent(query)}&page=${page}&limit=20`;
      if (filterType) url += `&type=${encodeURIComponent(filterType)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        const data = json.data as SearchResponse;
        results = data.results;
        total = data.total;
        facets = data.facets;
      }
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
    loading = false;
  }

  function handleInput() {
    clearTimeout(searchTimeout);
    page = 1;
    searchTimeout = setTimeout(performSearch, 250);
  }

  $effect(() => {
    void filterType;
    void page;
    if (query.trim()) performSearch();
  });

  function getHref(result: SearchResult): string {
    switch (result.type) {
      case 'person':
        return `/persons/${result.id}`;
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
      >
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        class="search-input"
        bind:value={query}
        oninput={handleInput}
        placeholder={m.search_placeholder()}
        autofocus
      />
    </div>
  </header>

  <div class="search-layout">
    <aside class="search-filters">
      <h3>{m.search_filter_type()}</h3>
      <button
        class="filter-item"
        class:active={!filterType}
        onclick={() => {
          filterType = '';
          page = 1;
        }}
      >
        {m.search_filter_all()}
        {#if total > 0}
          <span class="filter-count">{total}</span>
        {/if}
      </button>
      {#each Object.entries(facets) as [type, count] (type)}
        {#if count > 0}
          <button
            class="filter-item"
            class:active={filterType === type}
            onclick={() => {
              filterType = type;
              page = 1;
            }}
          >
            <span>{typeIcons[type] ?? '📝'} {typeLabels[type]?.() ?? type}</span>
            <span class="filter-count">{count}</span>
          </button>
        {/if}
      {/each}
    </aside>

    <main class="search-results">
      {#if loading}
        <div class="search-loading">Loading…</div>
      {:else if query.trim() && results.length === 0}
        <div class="search-empty">{m.search_no_results()}</div>
      {:else if results.length > 0}
        <p class="results-count">{m.search_results_count({ count: total.toString() })}</p>
        {#each results as result (result.id)}
          <a href={getHref(result)} class="result-card">
            <span class="result-icon">{typeIcons[result.type] ?? '📝'}</span>
            <div class="result-body">
              <span class="result-title">{result.title}</span>
              {#if result.snippet}
                <span class="result-snippet">{result.snippet}</span>
              {/if}
              <span class="result-type">{typeLabels[result.type]?.() ?? result.type}</span>
            </div>
          </a>
        {/each}

        {#if total > 20}
          <div class="pagination">
            <button class="page-btn" disabled={page <= 1} onclick={() => page--}>
              {m.pagination_previous()}
            </button>
            <span class="page-info">Page {page}</span>
            <button class="page-btn" disabled={results.length < 20} onclick={() => page++}>
              {m.pagination_next()}
            </button>
          </div>
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
    font-weight: var(--font-weight-bold);
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition-fast);
  }

  .search-input-wrapper:focus-within {
    border-color: var(--color-primary);
  }

  .search-icon {
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--font-size-lg);
  }

  .search-layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--space-8);
  }

  .search-filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .search-filters h3 {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .filter-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
    text-align: left;
  }

  .filter-item:hover {
    background: var(--color-surface-hover);
  }

  .filter-item.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
  }

  .filter-count {
    font-size: var(--font-size-xs);
    background: var(--color-bg-secondary);
    padding: 0 var(--space-2);
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
  }

  .results-count {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .result-card {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
    transition: all var(--transition-fast);
    text-decoration: none;
    color: inherit;
  }

  .result-card:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-hover);
  }

  .result-icon {
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .result-title {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .result-snippet {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-type {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .search-loading,
  .search-empty {
    text-align: center;
    padding: var(--space-12);
    color: var(--color-text-muted);
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-4);
    margin-top: var(--space-6);
  }

  .page-btn {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .search-layout {
      grid-template-columns: 1fr;
    }

    .search-filters {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-1);
    }

    .search-filters h3 {
      width: 100%;
    }
  }
</style>
