<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api, type PersonWithDetails, type RelationshipEntry } from '$lib/api';
  import type { Event } from '@ahnenbaum/core';
  import { sexOptions } from '$lib/constants';
  import { formatLifespan } from '$lib/utils/date-format';
  import {
    loadPerson as fetchPerson,
    loadRelationships as fetchRelationships,
    loadSiblings as fetchSiblings,
    loadExtendedFamily as fetchExtendedFamily,
    type ExtendedFamilyData,
  } from '$lib/person-data';
  import EventList from '$lib/components/EventList.svelte';
  import EventForm from '$lib/components/EventForm.svelte';
  import RelationshipList from '$lib/components/RelationshipList.svelte';
  import AddRelationshipModal from '$lib/components/AddRelationshipModal.svelte';
  import PersonMediaSection from '$lib/components/PersonMediaSection.svelte';
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
    <!-- Header -->
    <header class="person-header">
      <div class="person-avatar">
        <span class="avatar-initials">{initials}</span>
      </div>
      <div class="person-info">
        {#if isEditing}
          <div class="edit-name-row">
            <input class="edit-input" bind:value={editGiven} placeholder={m.person_given_name()} />
            <input class="edit-input" bind:value={editSurname} placeholder={m.person_surname()} />
          </div>
          <div class="edit-field">
            <label for="edit-sex">{m.person_sex()}</label>
            <select id="edit-sex" class="edit-select" bind:value={editSex}>
              {#each sexOptions as opt (opt.value)}
                <option value={opt.value}>{opt.label()}</option>
              {/each}
            </select>
          </div>
        {:else}
          <h1 class="person-name">
            {person.preferredName.given}
            {person.preferredName.surname}
          </h1>
          {#if lifespan}
            <span class="person-lifespan">{lifespan}</span>
          {/if}
          {#if person.birthPlace}
            <span class="person-place">📍 {person.birthPlace.name}</span>
          {/if}
          {#if person.allNames.length > 1}
            <div class="person-names-alt">
              {#each person.allNames.filter((n) => !n.isPreferred) as name (name.id)}
                <span class="name-badge">
                  {name.given}
                  {name.surname}
                  <small>({name.type})</small>
                </span>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
      <div class="header-actions">
        {#if isEditing}
          <button class="btn-secondary" onclick={cancelEdit}>{m.person_cancel()}</button>
          <button class="btn-primary" onclick={saveEdit}>{m.person_save()}</button>
        {:else}
          <button class="btn-edit" onclick={startEdit} aria-label={m.person_edit()}>
            ✏️ {m.person_edit()}
          </button>
        {/if}
      </div>
    </header>

    <!-- Notes -->
    <section class="person-notes">
      {#if isEditing}
        <label for="edit-notes" class="notes-label">{m.person_notes()}</label>
        <textarea id="edit-notes" class="edit-textarea" bind:value={editNotes} rows="3"></textarea>
      {:else if person.notes}
        <p>{person.notes}</p>
      {/if}
    </section>

    <div class="person-body">
      <div class="person-main">
        <EventList events={personEvents} />
        {#if showEventForm}
          <EventForm onSave={handleAddEvent} onCancel={() => (showEventForm = false)} />
        {:else}
          <button class="btn-add-outline" onclick={() => (showEventForm = true)}>
            + {m.event_add()}
          </button>
        {/if}

        <PersonMediaSection {personId} onToast={handleMediaToast} />
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

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .person-detail {
    max-width: 1000px;
    margin: 0 auto;
  }

  .person-header {
    display: flex;
    gap: var(--space-6);
    align-items: flex-start;
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-6);
  }

  .person-avatar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-full);
  }

  .avatar-initials {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .person-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .person-name {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
  }

  .person-lifespan {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  .person-place {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .person-names-alt {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-top: var(--space-2);
  }

  .name-badge {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
  }

  .name-badge small {
    color: var(--color-text-muted);
  }

  /* ── Edit mode ── */
  .header-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .btn-edit {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .btn-edit:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-primary,
  .btn-secondary {
    padding: var(--space-2) var(--space-3);
  }

  .edit-name-row {
    display: flex;
    gap: var(--space-2);
  }

  .edit-input,
  .edit-select,
  .edit-textarea {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: border-color var(--transition-fast);
  }

  .edit-input:focus,
  .edit-select:focus,
  .edit-textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .edit-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .edit-field label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .edit-textarea {
    width: 100%;
    resize: vertical;
  }

  /* ── Notes ── */
  .person-notes {
    margin-bottom: var(--space-6);
  }

  .person-notes p {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .notes-label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
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
    .person-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .header-actions {
      justify-content: center;
    }

    .edit-name-row {
      flex-direction: column;
    }

    .person-body {
      grid-template-columns: 1fr;
    }
  }
</style>
