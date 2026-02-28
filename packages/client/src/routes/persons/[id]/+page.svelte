<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api, type PersonWithDetails, type RelationshipEntry } from '$lib/api';
  import type { Event } from '@ahnenbaum/core';
  import { formatLifespan } from '$lib/utils/date-format';
  import {
    loadPerson as fetchPerson,
    loadRelationships as fetchRelationships,
    loadSiblings as fetchSiblings,
    loadExtendedFamily as fetchExtendedFamily,
    type ExtendedFamilyData,
  } from '$lib/person-data';
  import PersonHeader from '$lib/components/PersonHeader.svelte';
  import EventList from '$lib/components/EventList.svelte';
  import EventForm from '$lib/components/EventForm.svelte';
  import RelationshipList from '$lib/components/RelationshipList.svelte';
  import AddRelationshipModal from '$lib/components/AddRelationshipModal.svelte';
  import PersonMediaSection from '$lib/components/PersonMediaSection.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import PluginSlot from '$lib/plugin-slots/PluginSlot.svelte';
  import type { Sex, EventType, GenealogyDate } from '@ahnenbaum/core';

  const personId = $derived(page.params.id ?? '');

  // Use counter to force reactivity on mutations
  let refreshKey = $state(0);

  // Async person data
  let person = $state<PersonWithDetails | undefined>(undefined);
  let personEvents = $state<Event[]>([]);
  let relationships = $state<RelationshipEntry[]>([]);
  let siblings = $state<PersonWithDetails[]>([]);
  let extendedFamily = $state<ExtendedFamilyData | null>(null);
  let _loading = $state(true);

  async function loadAllData() {
    if (!personId) return;
    _loading = true;

    const result = await fetchPerson(personId);
    if (result) {
      person = result.person;
      personEvents = result.events;
    } else {
      person = undefined;
      personEvents = [];
    }

    relationships = await fetchRelationships(personId);
    siblings = await fetchSiblings(personId);
    extendedFamily = await fetchExtendedFamily(personId);

    _loading = false;
  }

  $effect(() => {
    void refreshKey;
    if (personId) {
      loadAllData();
    }
  });

  const lifespan = $derived(
    person ? formatLifespan(person.birthEvent?.date, person.deathEvent?.date) : '',
  );
  const initials = $derived(
    person
      ? `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`
      : '',
  );

  // ── Edit mode ──
  let isEditing = $state(false);
  let editGiven = $state('');
  let editSurname = $state('');
  let editSex: Sex = $state('unknown');
  let editNotes = $state('');

  // ── Event form ──
  let showEventForm = $state(false);

  // ── Relationship modal ──
  let showRelModal = $state(false);

  // ── Toast ──
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  // ── Event delete confirm ──
  let eventDeleteConfirmOpen = $state(false);
  let pendingDeleteEventId = $state<string | null>(null);

  // ── Media toast bridge ──
  function handleMediaToast(message: string, type: 'success' | 'error') {
    toastMessage = message;
    toastType = type;
  }

  function startEdit() {
    if (!person) return;
    editGiven = person.preferredName.given;
    editSurname = person.preferredName.surname;
    editSex = person.sex;
    editNotes = person.notes ?? '';
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
  }

  async function saveEdit() {
    if (!person) return;
    try {
      // Update person fields (sex, notes)
      await api.patch(`persons/${person.id}`, {
        sex: editSex,
        notes: editNotes.trim() || undefined,
      });
      // Update name fields via separate endpoint
      const preferredNameId = person.preferredName.id;
      await api.patch(`persons/${person.id}/names/${preferredNameId}`, {
        given: editGiven.trim(),
        surname: editSurname.trim(),
      });
      isEditing = false;
      refreshKey++;
      toastMessage = m.toast_person_updated();
      toastType = 'success';
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  async function handleAddEvent(data: {
    type: EventType;
    date?: GenealogyDate;
    description?: string;
  }) {
    if (!person) return;
    try {
      await api.post(`persons/${person.id}/events`, data);
      showEventForm = false;
      refreshKey++;
      toastMessage = m.toast_event_added();
      toastType = 'success';
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  function handleEditEvent(event: Event) {
    // For now, we delete the old and let the user re-add via form.
    // A full inline edit would require more UI — this gives immediate functionality.
    handleDeleteEventConfirm(event.id);
  }

  function handleDeleteEventConfirm(eventId: string) {
    pendingDeleteEventId = eventId;
    eventDeleteConfirmOpen = true;
  }

  async function executeDeleteEvent() {
    if (!person || !pendingDeleteEventId) return;
    try {
      await api.del(`persons/${person.id}/events/${pendingDeleteEventId}`);
      pendingDeleteEventId = null;
      refreshKey++;
      toastMessage = m.toast_event_deleted();
      toastType = 'success';
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }
</script>

<svelte:head>
  <title>
    {person
      ? `${person.preferredName.given} ${person.preferredName.surname} | ${m.app_title()}`
      : m.error_not_found()}
  </title>
</svelte:head>

{#if person}
  <div class="person-detail">
    <PersonHeader
      {person}
      {isEditing}
      {editGiven}
      {editSurname}
      {editSex}
      {editNotes}
      {lifespan}
      {initials}
      onStartEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSaveEdit={saveEdit}
      onGivenChange={(v) => (editGiven = v)}
      onSurnameChange={(v) => (editSurname = v)}
      onSexChange={(v) => (editSex = v)}
      onNotesChange={(v) => (editNotes = v)}
    />

    <div class="person-body">
      <div class="person-main">
        <EventList
          events={personEvents}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEventConfirm}
        />
        {#if showEventForm}
          <EventForm onSave={handleAddEvent} onCancel={() => (showEventForm = false)} />
        {:else}
          <button class="btn-add-outline" onclick={() => (showEventForm = true)}>
            + {m.event_add()}
          </button>
        {/if}

        <PersonMediaSection
          {personId}
          onToast={handleMediaToast}
          onPrimaryChanged={() => refreshKey++}
        />
        <PluginSlot slot="person.detail.tab" context={{ personId }} />
      </div>
      <aside class="person-sidebar">
        <RelationshipList {relationships} {siblings} {extendedFamily} />
        <button class="btn-add-outline" onclick={() => (showRelModal = true)}>
          + {m.relationship_add()}
        </button>

        <div class="person-meta">
          <a href="{base}/tree?root={person.id}" class="tree-link">
            🌳 {m.nav_tree()}
          </a>
        </div>

        <PluginSlot slot="person.detail.sidebar" context={{ personId }} />
      </aside>
    </div>
  </div>
{:else}
  <div class="not-found">
    <h1>{m.error_not_found()}</h1>
    <a href="{base}/persons">{m.error_go_back()}</a>
  </div>
{/if}

{#if person}
  <AddRelationshipModal
    bind:open={showRelModal}
    currentPersonId={person.id}
    onSaved={() => {
      refreshKey++;
    }}
  />
{/if}

<ConfirmDialog
  bind:open={eventDeleteConfirmOpen}
  title={m.event_delete()}
  message={m.event_delete_confirm()}
  confirmLabel={m.event_delete()}
  variant="danger"
  onConfirm={executeDeleteEvent}
/>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .person-detail {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* ── Body ── */
  .person-body {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-8);
  }

  .person-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .person-meta {
    margin-top: var(--space-4);
  }

  .tree-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .tree-link:hover {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-add-outline {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
    width: 100%;
    text-align: center;
  }

  .btn-add-outline:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .not-found {
    text-align: center;
    padding: var(--space-16) 0;
  }

  .not-found h1 {
    margin-bottom: var(--space-4);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .person-body {
      grid-template-columns: 1fr;
    }
  }
</style>
