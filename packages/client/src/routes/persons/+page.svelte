<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { getPersons, type GetPersonsOptions, type PersonWithDetails } from '$lib/data/mock-data';
  import { formatLifespan } from '$lib/utils/date-format';

  let searchQuery = $state('');
  let sortBy: GetPersonsOptions['sortBy'] = $state('name');
  let sortDir: 'asc' | 'desc' = $state('asc');
  let currentPage = $state(1);
  const pageSize = 10;

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let debouncedSearch = $state('');

  function onSearchInput(event: globalThis.Event) {
    const value = (event.target as HTMLInputElement).value;
    searchQuery = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      debouncedSearch = value;
      currentPage = 1; // Reset to first page on search
    }, 300);
  }

  const result = $derived(
    getPersons({
      search: debouncedSearch || undefined,
      sortBy,
      sortDir,
      page: currentPage,
      pageSize,
    }),
  );

  function toggleSort(column: GetPersonsOptions['sortBy']) {
    if (sortBy === column) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortDir = 'asc';
    }
    currentPage = 1;
  }

  function sortIndicator(column: GetPersonsOptions['sortBy']): string {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function getInitials(person: PersonWithDetails): string {
    return `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`;
  }
</script>

<svelte:head>
  <title>{m.nav_people()} | {m.app_title()}</title>
</svelte:head>

<div class="persons-page">
  <div class="persons-header">
    <h1>{m.nav_people()}</h1>
    <div class="persons-toolbar">
      <div class="search-box">
        <svg
          class="search-icon"
          width="16"
          height="16"
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
          value={searchQuery}
          oninput={onSearchInput}
          placeholder={m.search_placeholder()}
          class="search-input"
        />
      </div>
    </div>
  </div>

  {#if result.total === 0}
    <div class="empty-state">
      {#if debouncedSearch}
        <p>{m.person_no_results()}</p>
      {:else}
        <p>{m.person_no_persons()}</p>
      {/if}
    </div>
  {:else}
    <div class="table-wrapper">
      <table class="persons-table">
        <thead>
          <tr>
            <th class="col-avatar"></th>
            <th>
              <button class="sort-btn" onclick={() => toggleSort('name')}>
                {m.sort_name()}{sortIndicator('name')}
              </button>
            </th>
            <th>
              <button class="sort-btn" onclick={() => toggleSort('birth')}>
                {m.sort_birth()}{sortIndicator('birth')}
              </button>
            </th>
            <th>
              <button class="sort-btn" onclick={() => toggleSort('death')}>
                {m.sort_death()}{sortIndicator('death')}
              </button>
            </th>
            <th class="col-place">📍</th>
          </tr>
        </thead>
        <tbody>
          {#each result.items as person (person.id)}
            <tr>
              <td class="col-avatar">
                <a href="{base}/persons/{person.id}" class="avatar-link">
                  <span class="row-avatar">{getInitials(person)}</span>
                </a>
              </td>
              <td>
                <a href="{base}/persons/{person.id}" class="name-link">
                  <span class="person-surname">{person.preferredName.surname}</span>,
                  <span class="person-given">{person.preferredName.given}</span>
                </a>
              </td>
              <td class="col-date">
                {person.birthEvent?.date
                  ? formatLifespan(person.birthEvent.date, undefined).replace('–', '')
                  : ''}
              </td>
              <td class="col-date">
                {person.deathEvent?.date
                  ? formatLifespan(undefined, person.deathEvent.date).replace('–', '')
                  : ''}
              </td>
              <td class="col-place">
                {person.birthPlace?.name ?? ''}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if result.totalPages > 1}
      <div class="pagination">
        <button
          class="page-btn"
          disabled={currentPage <= 1}
          onclick={() => (currentPage = Math.max(1, currentPage - 1))}
        >
          {m.pagination_previous()}
        </button>

        <span class="page-info">
          {m.pagination_showing({
            from: String((currentPage - 1) * pageSize + 1),
            to: String(Math.min(currentPage * pageSize, result.total)),
            total: String(result.total),
          })}
        </span>

        <button
          class="page-btn"
          disabled={currentPage >= result.totalPages}
          onclick={() => (currentPage = Math.min(result.totalPages, currentPage + 1))}
        >
          {m.pagination_next()}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .persons-page {
    max-width: 900px;
    margin: 0 auto;
  }

  .persons-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .persons-header h1 {
    font-size: var(--font-size-2xl);
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    color: var(--color-text-muted);
    pointer-events: none;
  }

  .search-input {
    padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    width: 260px;
    transition: border-color var(--transition-fast);
  }

  .search-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .table-wrapper {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .persons-table {
    width: 100%;
    border-collapse: collapse;
  }

  .persons-table th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
  }

  .persons-table td {
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .persons-table tbody tr:last-child td {
    border-bottom: none;
  }

  .persons-table tbody tr:hover {
    background: var(--color-surface-hover);
  }

  .col-avatar {
    width: 48px;
  }

  .avatar-link {
    text-decoration: none;
  }

  .row-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  .sort-btn {
    font: inherit;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    white-space: nowrap;
  }

  .sort-btn:hover {
    color: var(--color-text);
  }

  .name-link {
    text-decoration: none;
    color: var(--color-text);
    font-weight: var(--font-weight-medium);
  }

  .name-link:hover {
    color: var(--color-primary);
  }

  .person-surname {
    font-weight: var(--font-weight-semibold);
  }

  .col-date {
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .col-place {
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-16) 0;
    color: var(--color-text-muted);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }

  .page-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
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
    .persons-header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input {
      width: 100%;
    }

    .col-place {
      display: none;
    }
  }
</style>
