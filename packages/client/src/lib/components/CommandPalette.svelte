<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api, type SearchableItem } from '$lib/api';

  let { open = $bindable(false) }: { open: boolean } = $props();

  let query = $state('');
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state(undefined);
  let results = $state<SearchableItem[]>([]);
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  async function doSearch(q: string) {
    try {
      if (!q.trim()) {
        // Show initial suggestions — first 10 persons
        const list = await api.get<{
          persons: Array<{
            id: string;
            names: Array<{ given: string; surname: string; isPreferred: boolean }>;
          }>;
          total: number;
        }>('persons', { limit: 10 });
        results = list.persons.map((p) => {
          const preferred = p.names.find((n) => n.isPreferred) ?? p.names[0];
          return {
            id: p.id,
            type: 'person' as const,
            label: preferred ? `${preferred.given} ${preferred.surname}` : p.id,
            href: `/persons/${p.id}`,
          };
        });
      } else {
        const data = await api.get<{
          results: Array<{ id: string; type: string; title: string; snippet: string }>;
          total: number;
        }>('search', { q, limit: 10 });
        results = data.results.map((r) => ({
          id: r.id,
          type: r.type as SearchableItem['type'],
          label: r.title,
          sublabel: r.snippet,
          href: r.type === 'person' ? `/persons/${r.id}` : '#',
        }));
      }
    } catch {
      results = [];
    }
  }

  $effect(() => {
    if (open) {
      doSearch('');
    }
  });

  $effect(() => {
    clearTimeout(debounceTimer);
    const q = query;
    debounceTimer = setTimeout(() => doSearch(q), 200);
    return () => clearTimeout(debounceTimer);
  });

  // Group results by type
  const groupedResults = $derived.by(() => {
    const groups: { type: string; label: string; items: SearchableItem[] }[] = [];
    const persons = results.filter((r) => r.type === 'person');
    const places = results.filter((r) => r.type === 'place');

    if (persons.length) groups.push({ type: 'person', label: m.search_persons(), items: persons });
    if (places.length) groups.push({ type: 'place', label: m.search_places(), items: places });

    return groups;
  });

  const flatResults = $derived(groupedResults.flatMap((g) => g.items));

  $effect(() => {
    if (open) {
      query = '';
      selectedIndex = 0;
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  // Reset selection when results change
  $effect(() => {
    if (results) selectedIndex = 0;
  });

  function close() {
    open = false;
  }

  function navigate(item: SearchableItem) {
    if (item.href === '#') return;
    close();
    goto(`${base}${item.href}`);
  }

  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, flatResults.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        event.preventDefault();
        if (flatResults[selectedIndex]) {
          navigate(flatResults[selectedIndex]);
        }
        break;
    }
  }
</script>

{#if open}
  <div class="palette-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="palette"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      <div class="palette-header">
        <svg
          class="search-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg
        >
        <input
          type="text"
          class="palette-input"
          bind:value={query}
          bind:this={inputEl}
          placeholder={m.search_placeholder()}
        />
        <kbd class="palette-kbd">ESC</kbd>
      </div>

      <div class="palette-results">
        {#if groupedResults.length === 0}
          <div class="palette-empty">{m.search_no_results()}</div>
        {:else}
          {#each groupedResults as group (group.type)}
            <div class="result-group">
              <div class="group-label">{group.label}</div>
              {#each group.items as item (item.id)}
                {@const globalIndex = flatResults.indexOf(item)}
                <button
                  class="result-item"
                  class:selected={globalIndex === selectedIndex}
                  onclick={() => navigate(item)}
                  onmouseenter={() => {
                    selectedIndex = globalIndex;
                  }}
                >
                  <span class="result-icon">
                    {#if item.type === 'person'}👤{:else if item.type === 'place'}📍{:else}📝{/if}
                  </span>
                  <div class="result-text">
                    <span class="result-label">{item.label}</span>
                    {#if item.sublabel}
                      <span class="result-sublabel">{item.sublabel}</span>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    padding-top: 15vh;
    z-index: var(--z-modal);
    animation: fade-in 100ms ease;
  }

  .palette {
    width: 100%;
    max-width: 560px;
    max-height: 420px;
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slide-down 150ms ease;
  }

  .palette-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .search-icon {
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  .palette-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--font-size-lg);
  }

  .palette-kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: 2px var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  .palette-results {
    overflow-y: auto;
    flex: 1;
  }

  .palette-empty {
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .result-group {
    padding: var(--space-2);
  }

  .group-label {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    text-align: left;
    transition: background var(--transition-fast);
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--color-surface-hover);
  }

  .result-icon {
    flex-shrink: 0;
    font-size: var(--font-size-lg);
  }

  .result-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .result-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .result-sublabel {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slide-down {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
