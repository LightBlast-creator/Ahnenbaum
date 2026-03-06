<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import * as m from '$lib/paraglide/messages';
  import { dataVersion } from '$lib/ws-invalidation';
  import { api, type PersonWithDetails, type RelationshipEntry } from '$lib/api';
  import type { Event, EventType, GenealogyDate, Sex } from '@ahnenbaum/core';
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
  import EventTimeline from '$lib/components/EventTimeline.svelte';
  import EventForm from '$lib/components/EventForm.svelte';
  import RelationshipList from '$lib/components/RelationshipList.svelte';
  import AddRelationshipModal from '$lib/components/AddRelationshipModal.svelte';
  import PersonMediaSection from '$lib/components/PersonMediaSection.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import PluginSlot from '$lib/plugin-slots/PluginSlot.svelte';

  const personId = $derived(page.params.id ?? '');

  // View preferences
  let eventsView = $state<'list' | 'timeline'>('list');

  // SSR-safe localStorage init
  $effect(() => {
    const saved = localStorage.getItem('ahnenbaum-events-view');
    if (saved === 'timeline') {
      eventsView = 'timeline';
    }
  });

  $effect(() => {
    localStorage.setItem('ahnenbaum-events-view', eventsView);
  });

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
    void $dataVersion;
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

  // ── Tabs ──
  let activeTab: 'events' | 'relationships' | 'media' = $state('events');

  // ── Event form ──
  let showEventForm = $state(false);

  // ── Relationship modal ──
  let showRelModal = $state(false);

  // ── Toast ──
  let toastMessage = $state('');
  let toastType: 'success' | 'error' | 'warning' | 'info' = $state('success');
  let toastOnUndo: (() => void) | undefined = $state(undefined);

  // ── Event delete confirm ──
  let eventDeleteConfirmOpen = $state(false);
  let pendingDeleteEventId = $state<string | null>(null);

  // ── Person delete confirm ──
  let personDeleteConfirmOpen = $state(false);

  // ── Relationship delete confirm ──
  let relDeleteConfirmOpen = $state(false);
  let pendingDeleteRelId = $state<string | null>(null);

  // ── Media toast bridge ──
  function handleMediaToast(message: string, type: 'success' | 'error') {
    toastMessage = message;
    toastType = type;
    toastOnUndo = undefined;
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
    endDate?: GenealogyDate;
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

  async function handleUpdateEvent(
    eventId: string,
    data: { type?: EventType; date?: GenealogyDate; endDate?: GenealogyDate; description?: string },
  ) {
    if (!person) return;
    try {
      await api.patch(`persons/${person.id}/events/${eventId}`, data);
      refreshKey++;
      toastMessage = m.toast_event_updated();
      toastType = 'success';
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  function handleDeleteEventConfirm(eventId: string) {
    pendingDeleteEventId = eventId;
    eventDeleteConfirmOpen = true;
  }

  async function executeDeleteEvent() {
    if (!person || !pendingDeleteEventId) return;

    // Snapshot event data for undo
    const eventToDelete = personEvents.find((e) => e.id === pendingDeleteEventId);
    const snapshot = eventToDelete
      ? {
          type: eventToDelete.type,
          date: eventToDelete.date,
          endDate: eventToDelete.endDate,
          description: eventToDelete.description,
        }
      : null;
    const pid = person.id;

    try {
      await api.del(`persons/${pid}/events/${pendingDeleteEventId}`);
      pendingDeleteEventId = null;
      refreshKey++;
      toastMessage = m.toast_event_deleted();
      toastType = 'success';
      toastOnUndo = snapshot
        ? async () => {
            try {
              await api.post(`persons/${pid}/events`, snapshot);
              refreshKey++;
              toastMessage = m.toast_event_added();
              toastType = 'success';
              toastOnUndo = undefined;
            } catch {
              toastMessage = m.toast_undo_failed();
              toastType = 'error';
              toastOnUndo = undefined;
            }
          }
        : undefined;
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
      toastOnUndo = undefined;
    }
  }

  // ── Person delete ──
  function handleDeletePerson() {
    personDeleteConfirmOpen = true;
  }

  async function executeDeletePerson() {
    if (!person) return;
    try {
      await api.del(`persons/${person.id}`);
      toastMessage = m.toast_person_deleted();
      toastType = 'success';
      goto(`${base}/persons`);
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  // ── Relationship delete ──
  function handleDeleteRelationship(relId: string) {
    pendingDeleteRelId = relId;
    relDeleteConfirmOpen = true;
  }

  async function executeDeleteRelationship() {
    if (!pendingDeleteRelId) return;

    // Snapshot relationship data for undo
    const relToDelete = relationships.find((r) => r.relationship.id === pendingDeleteRelId);
    const snapshot = relToDelete
      ? {
          person1Id: relToDelete.relationship.personAId,
          person2Id: relToDelete.relationship.personBId,
          type: relToDelete.relationship.type,
        }
      : null;

    try {
      await api.del(`relationships/${pendingDeleteRelId}`);
      pendingDeleteRelId = null;
      refreshKey++;
      toastMessage = m.toast_relationship_deleted();
      toastType = 'success';
      toastOnUndo = snapshot
        ? async () => {
            try {
              await api.post('relationships', snapshot);
              refreshKey++;
              toastMessage = m.toast_relationship_created();
              toastType = 'success';
              toastOnUndo = undefined;
            } catch {
              toastMessage = m.toast_undo_failed();
              toastType = 'error';
              toastOnUndo = undefined;
            }
          }
        : undefined;
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
      toastOnUndo = undefined;
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
      treeUrl="{base}/tree?root={person.id}"
      onStartEdit={startEdit}
      onCancelEdit={cancelEdit}
      onSaveEdit={saveEdit}
      onDelete={handleDeletePerson}
      onGivenChange={(v) => (editGiven = v)}
      onSurnameChange={(v) => (editSurname = v)}
      onSexChange={(v) => (editSex = v)}
      onNotesChange={(v) => (editNotes = v)}
    />

    <div class="person-tabs">
      <button
        class="tab-btn"
        class:active={activeTab === 'events'}
        onclick={() => (activeTab = 'events')}
      >
        {m.events_title()}
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === 'relationships'}
        onclick={() => (activeTab = 'relationships')}
      >
        {m.relationships_title()}
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === 'media'}
        onclick={() => (activeTab = 'media')}
      >
        {m.media_title()}
      </button>
    </div>

    <div class="person-tab-content">
      {#if activeTab === 'events'}
        <div class="view-controls">
          <div class="view-toggle">
            <button
              class="view-toggle-btn"
              class:active={eventsView === 'list'}
              onclick={() => (eventsView = 'list')}
              aria-label={m.events_view_list()}
              title={m.events_view_list()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"
                ></line><line x1="8" y1="18" x2="21" y2="18"></line><line
                  x1="3"
                  y1="6"
                  x2="3.01"
                  y2="6"
                ></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line
                  x1="3"
                  y1="18"
                  x2="3.01"
                  y2="18"
                ></line></svg
              >
            </button>
            <button
              class="view-toggle-btn"
              class:active={eventsView === 'timeline'}
              onclick={() => (eventsView = 'timeline')}
              aria-label={m.events_view_timeline()}
              title={m.events_view_timeline()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"
                ></line><line x1="6" y1="20" x2="6" y2="16"></line></svg
              >
            </button>
          </div>
        </div>

        {#if eventsView === 'list'}
          <EventList
            events={personEvents}
            onUpdate={handleUpdateEvent}
            onDelete={handleDeleteEventConfirm}
          />
        {:else}
          <EventTimeline events={personEvents} onDelete={handleDeleteEventConfirm} />
        {/if}

        {#if showEventForm}
          <EventForm onSave={handleAddEvent} onCancel={() => (showEventForm = false)} />
        {:else}
          <button class="btn-add-outline" onclick={() => (showEventForm = true)}>
            + {m.event_add()}
          </button>
        {/if}
        <PluginSlot slot="person.detail.tab" context={{ personId }} />
      {/if}

      {#if activeTab === 'relationships'}
        <RelationshipList
          {relationships}
          {siblings}
          {extendedFamily}
          onDeleteRelationship={handleDeleteRelationship}
        />
        <button class="btn-add-outline" onclick={() => (showRelModal = true)}>
          + {m.relationship_add()}
        </button>
        <PluginSlot slot="person.detail.sidebar" context={{ personId }} />
      {/if}

      {#if activeTab === 'media'}
        <PersonMediaSection
          {personId}
          onToast={handleMediaToast}
          onPrimaryChanged={() => refreshKey++}
        />
      {/if}
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

<ConfirmDialog
  bind:open={personDeleteConfirmOpen}
  title={m.person_delete()}
  message={m.person_delete_confirm()}
  confirmLabel={m.person_delete()}
  variant="danger"
  onConfirm={executeDeletePerson}
/>

<ConfirmDialog
  bind:open={relDeleteConfirmOpen}
  title={m.relationship_delete()}
  message={m.relationship_delete_confirm()}
  confirmLabel={m.relationship_delete()}
  variant="danger"
  onConfirm={executeDeleteRelationship}
/>

<Toast
  message={toastMessage}
  type={toastType}
  onUndo={toastOnUndo}
  onDismiss={() => {
    toastMessage = '';
    toastOnUndo = undefined;
  }}
/>

<style>
  .person-detail {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* ── Tabs ── */
  .person-tabs {
    display: flex;
    gap: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-6);
    overflow-x: auto;
    scrollbar-width: none; /* Hide scrollbar in Firefox */
  }

  .person-tabs::-webkit-scrollbar {
    display: none; /* Hide scrollbar in Chrome/Safari */
  }

  .view-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--space-4);
  }

  .view-toggle {
    display: inline-flex;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 2px;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-3);
    border-radius: calc(var(--radius-md) - 2px);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .view-toggle-btn:hover {
    color: var(--color-text);
  }

  .view-toggle-btn.active {
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  .tab-btn {
    padding: var(--space-3) 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
    background: transparent;
    white-space: nowrap;
  }

  .tab-btn:hover {
    color: var(--color-text);
  }

  .tab-btn.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .person-tab-content {
    animation: fade-in 200ms ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .not-found {
    text-align: center;
    padding: var(--space-16) 0;
  }

  .not-found h1 {
    margin-bottom: var(--space-4);
    color: var(--color-text-muted);
  }
</style>
