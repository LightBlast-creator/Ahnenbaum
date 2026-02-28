<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import {
    api,
    toPersonWithDetails,
    type PersonWithDetails,
    type ServerPersonResponse,
    type GetPersonsOptions,
  } from '$lib/api';
  import { extractYear } from '$lib/utils/date-format';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import PersonsTable from '$lib/components/PersonsTable.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

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
        persons: ServerPersonResponse[];
        total: number;
      }>('persons', { page: 1, limit: 200 });
      allPersons = data.persons.map((p) => toPersonWithDetails(p));
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
        const yearA = parseInt(extractYear(a.birthEvent?.date), 10) || 0;
        const yearB = parseInt(extractYear(b.birthEvent?.date), 10) || 0;
        return dir * (yearA - yearB);
      }
      if (sortBy === 'death') {
        const yearA = parseInt(extractYear(a.deathEvent?.date), 10) || 0;
        const yearB = parseInt(extractYear(b.deathEvent?.date), 10) || 0;
        return dir * (yearA - yearB);
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
    {#if debouncedSearch}
      <EmptyState icon="search" title={m.person_no_results()} />
    {:else}
      <EmptyState
        icon="people"
        title={m.person_no_persons()}
        actionLabel={m.person_add()}
        onAction={() => {
          const event = new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true });
          window.dispatchEvent(event);
        }}
      />
    {/if}
  {:else}
    <PersonsTable
      items={result.items}
      {sortBy}
      {sortDir}
      onToggleSort={toggleSort}
      onDelete={handleDeleteClick}
    />

    <Pagination
      page={result.page}
      totalPages={result.totalPages}
      total={result.total}
      {pageSize}
      onPageChange={(p) => (currentPage = p)}
    />
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

  @media (max-width: 768px) {
    .persons-header {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input {
      width: 100%;
    }
  }
</style>
