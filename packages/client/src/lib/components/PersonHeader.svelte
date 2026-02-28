<script lang="ts">
  import type { PersonWithDetails } from '$lib/api';
  import type { Sex } from '@ahnenbaum/core';
  import { sexOptions } from '$lib/constants';
  import { calculateAge } from '$lib/utils/date-format';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    person: PersonWithDetails;
    isEditing: boolean;
    editGiven: string;
    editSurname: string;
    editSex: Sex;
    editNotes: string;
    lifespan: string;
    initials: string;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onGivenChange: (value: string) => void;
    onSurnameChange: (value: string) => void;
    onSexChange: (value: Sex) => void;
    onNotesChange: (value: string) => void;
  }

  let {
    person,
    isEditing,
    editGiven,
    editSurname,
    editSex,
    editNotes,
    lifespan,
    initials,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onGivenChange,
    onSurnameChange,
    onSexChange,
    onNotesChange,
  }: Props = $props();
</script>

<header class="person-header">
  <div class="person-avatar" data-sex={person.sex}>
    {#if person.primaryPhotoUrl}
      <img src={person.primaryPhotoUrl} alt="" class="avatar-photo" />
    {:else}
      <span class="avatar-initials">{initials}</span>
    {/if}
  </div>
  <div class="person-info">
    {#if isEditing}
      <div class="edit-name-row">
        <input
          class="edit-input"
          value={editGiven}
          oninput={(e) => onGivenChange((e.target as HTMLInputElement).value)}
          placeholder={m.person_given_name()}
        />
        <input
          class="edit-input"
          value={editSurname}
          oninput={(e) => onSurnameChange((e.target as HTMLInputElement).value)}
          placeholder={m.person_surname()}
        />
      </div>
      <div class="edit-field">
        <label for="edit-sex">{m.person_sex()}</label>
        <select
          id="edit-sex"
          class="edit-select"
          value={editSex}
          onchange={(e) => onSexChange((e.target as HTMLSelectElement).value as Sex)}
        >
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
        <span class="person-lifespan">
          {lifespan}
          {#if calculateAge(person.birthEvent?.date, person.deathEvent?.date)}
            <span class="person-age"
              >{calculateAge(person.birthEvent?.date, person.deathEvent?.date)}</span
            >
          {/if}
        </span>
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
      <button class="btn-secondary" onclick={onCancelEdit}>{m.person_cancel()}</button>
      <button class="btn-primary" onclick={onSaveEdit}>{m.person_save()}</button>
    {:else}
      <button class="btn-edit" onclick={onStartEdit} aria-label={m.person_edit()}>
        ✏️ {m.person_edit()}
      </button>
    {/if}
  </div>
</header>

<!-- Notes -->
<section class="person-notes">
  {#if isEditing}
    <label for="edit-notes" class="notes-label">{m.person_notes()}</label>
    <textarea
      id="edit-notes"
      class="edit-textarea"
      value={editNotes}
      oninput={(e) => onNotesChange((e.target as HTMLTextAreaElement).value)}
      rows="3"
    ></textarea>
  {:else if person.notes}
    <p>{person.notes}</p>
  {/if}
</section>

<style>
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
    box-shadow:
      0 0 0 3px var(--color-bg),
      0 0 0 5px var(--color-border);
    transition: box-shadow var(--transition-fast);
  }

  .person-avatar[data-sex='male'] {
    box-shadow:
      0 0 0 3px var(--color-bg),
      0 0 0 5px #5b8dd9;
  }

  .person-avatar[data-sex='female'] {
    box-shadow:
      0 0 0 3px var(--color-bg),
      0 0 0 5px #d97ba3;
  }

  .person-avatar[data-sex='intersex'] {
    box-shadow:
      0 0 0 3px var(--color-bg),
      0 0 0 5px #b89c5a;
  }

  .avatar-initials {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-full);
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

  .person-age {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-left: var(--space-1);
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
  }
</style>
