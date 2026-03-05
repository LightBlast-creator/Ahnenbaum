<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { dataVersion } from '$lib/ws-invalidation';
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
    void $dataVersion;
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

<div class="entity-page">
  <header class="page-header">
    <h1>{m.place_title()}</h1>
    <button class="btn-primary" onclick={() => (showAddForm = !showAddForm)}>
      + {m.place_add()}
    </button>
  </header>

  <!-- Add form -->
  {#if showAddForm}
    <div class="add-form card">
      <div class="form-row places-grid">
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
    <div class="entity-table">
      <div class="table-header places-grid">
        <span>{m.place_name()}</span>
        <span>{m.place_latitude()}</span>
        <span>{m.place_longitude()}</span>
        <span class="col-actions"></span>
      </div>
      {#each places as place (place.id)}
        {#if editingId === place.id}
          <div class="table-row editing places-grid">
            <span><input type="text" bind:value={editName} class="inline-input" /></span>
            <span><input type="number" step="any" bind:value={editLat} class="inline-input" /></span
            >
            <span><input type="number" step="any" bind:value={editLng} class="inline-input" /></span
            >
            <span class="col-actions">
              <button class="btn-icon" onclick={saveEdit} disabled={saving} title={m.person_save()}
                >✓</button
              >
              <button class="btn-icon" onclick={cancelEdit} title={m.person_cancel()}>✕</button>
            </span>
          </div>
        {:else}
          <div class="table-row places-grid">
            <span class="cell-name">{place.name}</span>
            <span class="cell-muted">{place.latitude ?? '—'}</span>
            <span class="cell-muted">{place.longitude ?? '—'}</span>
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
  /* Page-specific grid (shared classes handle everything else) */
  .places-grid {
    grid-template-columns: 2fr 1fr 1fr auto;
  }

  .cell-muted {
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 768px) {
    .places-grid {
      grid-template-columns: 1fr auto;
    }
  }
</style>
