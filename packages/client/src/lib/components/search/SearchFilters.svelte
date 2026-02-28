<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    facets: Record<string, number>;
    filterType: string;
    typeLabels: Record<string, () => string>;
    typeIcons: Record<string, string>;
    onFilterChange: (type: string) => void;
  }

  let { facets, filterType, typeLabels, typeIcons, onFilterChange }: Props = $props();
</script>

<aside class="search-filters">
  <h3>{m.search_filter_type()}</h3>
  <button class="filter-item" class:active={!filterType} onclick={() => onFilterChange('')}>
    <span>{m.search_filter_all()}</span>
  </button>
  {#each Object.entries(facets) as [type, count] (type)}
    {#if count > 0}
      <button
        class="filter-item"
        class:active={filterType === type}
        onclick={() => onFilterChange(type)}
      >
        <span>{typeIcons[type] ?? '📝'} {typeLabels[type]?.() ?? type}</span>
        <span class="filter-count">{count}</span>
      </button>
    {/if}
  {/each}
</aside>

<style>
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
    cursor: pointer;
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
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    min-width: 20px;
    text-align: center;
  }

  @media (max-width: 768px) {
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
