<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolveRoute } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { createPerson, checkDuplicatePerson, type CreatePersonData } from '$lib/data/mock-data';
  import DateInput from '$lib/components/DateInput.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import type { GenealogyDate, Sex } from '@ahnenbaum/core';

  let { open = $bindable(false) }: { open: boolean } = $props();

  // Form state
  let given = $state('');
  let surname = $state('');
  let sex: Sex = $state('unknown');
  let showOptional = $state(false);
  let birthDate: GenealogyDate | undefined = $state(undefined);
  let deathDate: GenealogyDate | undefined = $state(undefined);
  let notes = $state('');

  // UI state
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');

  // Validation
  const isValid = $derived(given.trim().length > 0 || surname.trim().length > 0);
  const isDirty = $derived(
    given.trim().length > 0 ||
      surname.trim().length > 0 ||
      sex !== 'unknown' ||
      birthDate !== undefined ||
      deathDate !== undefined ||
      notes.trim().length > 0,
  );

  // Duplicate detection (#27)
  const duplicates = $derived.by(() => {
    const g = given.trim();
    const s = surname.trim();
    if (g.length < 2 && s.length < 2) return [];
    return checkDuplicatePerson(g, s);
  });
  const hasDuplicateWarning = $derived(duplicates.length > 0);

  let givenInput: HTMLInputElement | undefined = $state(undefined);

  $effect(() => {
    if (open) {
      // Focus given name on open
      requestAnimationFrame(() => givenInput?.focus());
    }
  });

  function resetForm() {
    given = '';
    surname = '';
    sex = 'unknown';
    showOptional = false;
    birthDate = undefined;
    deathDate = undefined;
    notes = '';
  }

  function close() {
    if (isDirty && !confirm(m.confirm_discard())) return;
    open = false;
    resetForm();
  }

  function save(addAnother = false) {
    if (!isValid) return;

    const data: CreatePersonData = {
      given: given.trim(),
      surname: surname.trim(),
      sex,
      birthDate,
      deathDate,
      notes: notes.trim() || undefined,
    };

    const person = createPerson(data);

    if (addAnother) {
      resetForm();
      toastMessage = m.toast_person_created();
      toastType = 'success';
      requestAnimationFrame(() => givenInput?.focus());
    } else {
      open = false;
      resetForm();
      goto(resolveRoute('/persons/[id]', { id: person.id }));
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'Enter' && isValid && !event.shiftKey) {
      event.preventDefault();
      save(false);
    }
  }

  const sexOptions: { value: Sex; label: () => string }[] = [
    { value: 'unknown', label: () => m.person_sex_unknown() },
    { value: 'male', label: () => m.person_sex_male() },
    { value: 'female', label: () => m.person_sex_female() },
    { value: 'intersex', label: () => m.person_sex_intersex() },
  ];
</script>

{#if open}
  <div class="modal-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-label={m.person_add()}
      tabindex="-1"
    >
      <div class="modal-header">
        <h2>{m.person_add()}</h2>
        <button class="modal-close" onclick={close} aria-label={m.shortcuts_close()}>×</button>
      </div>

      <div class="modal-body">
        <div class="form-row">
          <div class="form-field">
            <label for="given-name">{m.person_given_name()}</label>
            <input
              id="given-name"
              type="text"
              bind:value={given}
              bind:this={givenInput}
              placeholder="Max"
            />
          </div>
          <div class="form-field">
            <label for="surname">{m.person_surname()}</label>
            <input id="surname" type="text" bind:value={surname} placeholder="Müller" />
          </div>
        </div>

        <div class="form-field">
          <label for="sex">{m.person_sex()}</label>
          <select id="sex" bind:value={sex}>
            {#each sexOptions as opt (opt.value)}
              <option value={opt.value}>{opt.label()}</option>
            {/each}
          </select>
        </div>

        {#if hasDuplicateWarning}
          <div class="duplicate-warning" role="alert">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>{m.duplicate_warning()}:</strong>
              <ul class="duplicate-list">
                {#each duplicates.slice(0, 3) as dup (dup.id)}
                  <li>{dup.preferredName.given} {dup.preferredName.surname}</li>
                {/each}
              </ul>
            </div>
          </div>
        {/if}

        <button class="toggle-optional" onclick={() => (showOptional = !showOptional)}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            {#if showOptional}
              <polyline points="18 15 12 9 6 15" />
            {:else}
              <polyline points="6 9 12 15 18 9" />
            {/if}
          </svg>
          {m.optional_fields()}
        </button>

        {#if showOptional}
          <div class="optional-fields">
            <DateInput bind:value={birthDate} label={m.person_birth_date()} />
            <DateInput bind:value={deathDate} label={m.person_death_date()} />
            <div class="form-field">
              <label for="notes">{m.person_notes()}</label>
              <textarea id="notes" bind:value={notes} rows="3"></textarea>
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={close}>
          {m.person_cancel()}
        </button>
        <button class="btn-secondary" onclick={() => save(true)} disabled={!isValid}>
          {m.person_save_add_another()}
        </button>
        <button class="btn-primary" onclick={() => save(false)} disabled={!isValid}>
          {m.person_save()}
        </button>
      </div>
    </div>
  </div>
{/if}

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
    animation: fade-in 150ms ease;
  }

  .modal {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    overflow-y: auto;
    animation: scale-in 150ms ease;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h2 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
  }

  .modal-close {
    font-size: var(--font-size-2xl);
    color: var(--color-text-muted);
    padding: var(--space-1);
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--color-text);
  }

  .modal-body {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
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

  .form-field input,
  .form-field select,
  .form-field textarea {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: border-color var(--transition-fast);
  }

  .form-field input:focus,
  .form-field select:focus,
  .form-field textarea:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .form-field textarea {
    resize: vertical;
  }

  .toggle-optional {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    padding: var(--space-2) 0;
  }

  .toggle-optional:hover {
    color: var(--color-text);
  }

  .optional-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border);
  }

  .btn-primary,
  .btn-secondary {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .duplicate-warning {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-3);
    background: hsl(45 93% 94%);
    border: 1px solid hsl(45 93% 60%);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  :global([data-theme='dark']) .duplicate-warning {
    background: hsl(45 40% 15%);
    border-color: hsl(45 70% 35%);
  }

  .warning-icon {
    flex-shrink: 0;
  }

  .duplicate-list {
    margin-top: var(--space-1);
    padding-left: var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop {
      animation: none;
    }

    .modal {
      animation: none;
    }
  }
</style>
