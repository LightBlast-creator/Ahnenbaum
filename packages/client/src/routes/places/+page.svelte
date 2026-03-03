<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SkeletonLoader from '$lib/components/SkeletonLoader.svelte';

  interface PlaceRow {
    id: string;
    name: string;
    parentId: string | null;
    latitude: number | null;
    longitude: number | null;
  }

  // ── State ──
  let places = $state<PlaceRow[]>([]);
  let loading = $state(true);
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  // ── Add form ──
  let showAddForm = $state(false);
  let addName = $state('');
  let addLat = $state('');
  let addLng = $state('');
  let saving = $state(false);

  // ── Edit ──
  let editingId = $state<string | null>(null);
  let editName = $state('');
  let editLat = $state('');
  let editLng = $state('');

  // ── Delete ──
  let deleteConfirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);

  // ── Load ──
  async function loadPlaces() {
    loading = true;
    try {
      const data = await api.get<{ places: PlaceRow[]; total: number }>('places', { limit: 200 });
      places = data.places;
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
    loading = false;
  }

  $effect(() => {
    loadPlaces();
  });

  // ── Add ──
  function resetAddForm() {
    addName = '';
    addLat = '';
    addLng = '';
  }

  async function createPlace() {
    if (!addName.trim() || saving) return;
    saving = true;
    try {
      await api.post('places', {
        name: addName.trim(),
        latitude: addLat ? parseFloat(addLat) : undefined,
        longitude: addLng ? parseFloat(addLng) : undefined,
      });
      toastMessage = m.toast_place_created();
      toastType = 'success';
      resetAddForm();
      showAddForm = false;
      loadPlaces();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    } finally {
      saving = false;
    }
  }

  // ── Edit ──
  function startEdit(place: PlaceRow) {
    editingId = place.id;
    editName = place.name;
    editLat = place.latitude?.toString() ?? '';
    editLng = place.longitude?.toString() ?? '';
  }

  function cancelEdit() {
    editingId = null;
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || saving) return;
    saving = true;
    try {
      await api.patch(`places/${editingId}`, {
        name: editName.trim(),
        latitude: editLat ? parseFloat(editLat) : null,
        longitude: editLng ? parseFloat(editLng) : null,
      });
      toastMessage = m.toast_place_updated();
      toastType = 'success';
      editingId = null;
      loadPlaces();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    } finally {
      saving = false;
    }
  }

  // ── Delete ──
  function handleDelete(id: string) {
    pendingDeleteId = id;
    deleteConfirmOpen = true;
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;
    try {
      await api.del(`places/${pendingDeleteId}`);
      toastMessage = m.toast_place_deleted();
      toastType = 'success';
      if (editingId === pendingDeleteId) editingId = null;
      pendingDeleteId = null;
      loadPlaces();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }
</script>

<svelte:head>
  <title>{m.place_title()} | {m.app_title()}</title>
</svelte:head>

<div class="places-page">
  <header class="page-header">
    <h1>{m.place_title()}</h1>
    <button class="btn-primary" onclick={() => (showAddForm = !showAddForm)}>
      + {m.place_add()}
    </button>
  </header>

  <!-- Add form -->
  {#if showAddForm}
    <div class="add-form card">
      <div class="form-row">
        <div class="form-field">
          <label for="add-name">{m.place_name()} *</label>
          <input id="add-name" type="text" bind:value={addName} required />
        </div>
        <div class="form-field">
          <label for="add-lat">{m.place_latitude()}</label>
          <input id="add-lat" type="number" step="any" bind:value={addLat} />
        </div>
        <div class="form-field">
          <label for="add-lng">{m.place_longitude()}</label>
          <input id="add-lng" type="number" step="any" bind:value={addLng} />
        </div>
      </div>
      <div class="form-actions">
        <button
          class="btn-secondary"
          onclick={() => {
            showAddForm = false;
            resetAddForm();
          }}>{m.person_cancel()}</button
        >
        <button class="btn-primary" onclick={createPlace} disabled={!addName.trim() || saving}
          >{m.person_save()}</button
        >
      </div>
    </div>
  {/if}

  <!-- Place list -->
  {#if loading}
    <SkeletonLoader variant="card" count={4} />
  {:else if places.length === 0}
    <p class="empty">{m.place_empty()}</p>
  {:else}
    <div class="place-table">
      <div class="table-header">
        <span class="col-name">{m.place_name()}</span>
        <span class="col-lat">{m.place_latitude()}</span>
        <span class="col-lng">{m.place_longitude()}</span>
        <span class="col-actions"></span>
      </div>
      {#each places as place (place.id)}
        {#if editingId === place.id}
          <div class="table-row editing">
            <span class="col-name"
              ><input type="text" bind:value={editName} class="inline-input" /></span
            >
            <span class="col-lat"
              ><input type="number" step="any" bind:value={editLat} class="inline-input" /></span
            >
            <span class="col-lng"
              ><input type="number" step="any" bind:value={editLng} class="inline-input" /></span
            >
            <span class="col-actions">
              <button class="btn-icon" onclick={saveEdit} disabled={saving} title={m.person_save()}
                >✓</button
              >
              <button class="btn-icon" onclick={cancelEdit} title={m.person_cancel()}>✕</button>
            </span>
          </div>
        {:else}
          <div class="table-row">
            <span class="col-name place-name">{place.name}</span>
            <span class="col-lat coord">{place.latitude ?? '—'}</span>
            <span class="col-lng coord">{place.longitude ?? '—'}</span>
            <span class="col-actions">
              <button class="btn-icon" onclick={() => startEdit(place)} title={m.place_edit()}
                >✏️</button
              >
              <button
                class="btn-icon delete"
                onclick={() => handleDelete(place.id)}
                title={m.place_delete()}>🗑️</button
              >
            </span>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog
  bind:open={deleteConfirmOpen}
  title={m.place_delete()}
  message={m.place_delete_confirm()}
  confirmLabel={m.place_delete()}
  variant="danger"
  onConfirm={executeDelete}
/>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .places-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-6);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-3);
  }

  .add-form {
    margin-bottom: var(--space-6);
  }

  .form-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-field label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .form-field input {
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    background: var(--color-bg);
    color: var(--color-text);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .place-table {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .table-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr auto;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    transition: background var(--transition-fast);
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: var(--color-surface-hover);
  }

  .table-row.editing {
    background: var(--color-bg-secondary);
  }

  .place-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .coord {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
  }

  .col-actions {
    display: flex;
    gap: var(--space-1);
    min-width: 60px;
    justify-content: flex-end;
  }

  .inline-input {
    width: 100%;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    background: var(--color-bg);
    color: var(--color-text);
  }

  .btn-icon {
    padding: var(--space-1);
    font-size: var(--font-size-sm);
    opacity: 0.4;
    transition: opacity var(--transition-fast);
  }

  .btn-icon:hover {
    opacity: 1;
  }

  .btn-icon.delete:hover {
    color: #ef4444;
  }

  .empty {
    text-align: center;
    color: var(--color-text-muted);
    padding: var(--space-8);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .table-header,
    .table-row {
      grid-template-columns: 1fr auto;
    }

    .col-lat,
    .col-lng {
      display: none;
    }
  }
</style>
