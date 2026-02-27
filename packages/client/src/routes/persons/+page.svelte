<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import {
    api,
    toPersonWithDetails,
    type PersonWithDetails,
    type GetPersonsOptions,
  } from '$lib/api';
  import { formatLifespan } from '$lib/utils/date-format';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let searchQuery = $state('');
  let sortBy: GetPersonsOptions['sortBy'] = $state('name');
  let sortDir: 'asc' | 'desc' = $state('asc');
  let currentPage = $state(1);
  const pageSize = 10;

  // Toast
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  // Confirm dialog
  let confirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);

  // Data
  let allPersons = $state<PersonWithDetails[]>([]);
  let _loading = $state(true);
  let refreshKey = $state(0);

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let debouncedSearch = $state('');

  function onSearchInput(event: globalThis.Event) {
    const value = (event.target as HTMLInputElement).value;
    searchQuery = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      debouncedSearch = value;
      currentPage = 1;
    }, 300);
  }

  // Load all persons from API (server returns enriched data)
  async function loadPersons() {
    _loading = true;
    try {
      // Fetch a generous page to enable client-side sort/filter
      const data = await api.get<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        persons: Array<any>;
        total: number;
      }>('persons', { page: 1, limit: 200 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allPersons = data.persons.map((p: any) => toPersonWithDetails(p));
    } catch {
      allPersons = [];
    }
    _loading = false;
  }

  $effect(() => {
    void refreshKey;
    loadPersons();
  });

  // Client-side search + sort + paginate
  const result = $derived.by(() => {
    let filtered = allPersons;

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((p) =>
        p.allNames.some(
          (n) =>
            n.given.toLowerCase().includes(q) ||
            n.surname.toLowerCase().includes(q) ||
            (n.maiden?.toLowerCase().includes(q) ?? false) ||
            (n.nickname?.toLowerCase().includes(q) ?? false),
        ),
      );
    }

    // Sort
    const dir = sortDir === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'birth') {
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dir * ((a.birthEvent?.date as any)?.year ?? 0) - ((b.birthEvent?.date as any)?.year ?? 0)
        );
      }
      if (sortBy === 'death') {
        return (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dir * ((a.deathEvent?.date as any)?.year ?? 0) - ((b.deathEvent?.date as any)?.year ?? 0)
        );
      }
      // Default: by name
      const nameA = `${a.preferredName.surname} ${a.preferredName.given}`.toLowerCase();
      const nameB = `${b.preferredName.surname} ${b.preferredName.given}`.toLowerCase();
      return dir * nameA.localeCompare(nameB);
    });

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (currentPage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return { items, total, page: currentPage, pageSize, totalPages };
  });

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

  function handleDeleteClick(personId: string, event: MouseEvent) {
    if (event.shiftKey) {
      executeDelete(personId);
    } else {
      pendingDeleteId = personId;
      confirmOpen = true;
    }
  }

  async function executeDelete(personId: string) {
    try {
      await api.del(`persons/${personId}`);
      refreshKey++;
      toastMessage = m.toast_person_deleted();
      toastType = 'success';
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  function onConfirmDelete() {
    if (pendingDeleteId) {
      executeDelete(pendingDeleteId);
      pendingDeleteId = null;
    }
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
            <th class="col-actions"></th>
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
              <td class="col-actions">
                <button
                  class="btn-delete"
                  onclick={(e: MouseEvent) => handleDeleteClick(person.id, e)}
                  aria-label={m.person_delete()}
                  title={m.person_delete()}
                >
                  🗑️
                </button>
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

<ConfirmDialog
  bind:open={confirmOpen}
  title={m.person_delete()}
  message={m.person_delete_confirm()}
  confirmLabel={m.person_delete()}
  variant="danger"
  onConfirm={onConfirmDelete}
/>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

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

  .col-actions {
    width: 48px;
    text-align: center;
  }

  .btn-delete {
    padding: var(--space-1);
    font-size: var(--font-size-sm);
    line-height: 1;
    border-radius: var(--radius-md);
    opacity: 0.4;
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .btn-delete:hover {
    opacity: 1;
    background: var(--color-danger-light, rgba(239, 68, 68, 0.1));
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
