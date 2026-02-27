<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolveRoute } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api, ApiError, type CreatePersonInput } from '$lib/api';
  import { sexOptions } from '$lib/constants';
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
  let saving = $state(false);

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

  // Duplicate detection via search API
  let duplicates = $state<Array<{ id: string; label: string }>>([]);
  let dupTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const g = given.trim();
    const s = surname.trim();
    clearTimeout(dupTimer);
    if (g.length < 2 && s.length < 2) {
      duplicates = [];
      return;
    }
    dupTimer = setTimeout(async () => {
      try {
        const q = `${g} ${s}`.trim();
        const data = await api.get<{ results: Array<{ id: string; title: string; type: string }> }>(
          'search',
          { q, type: 'person', limit: 3 },
        );
        duplicates = data.results.map((r) => ({ id: r.id, label: r.title }));
      } catch {
        duplicates = [];
      }
    }, 300);
    return () => clearTimeout(dupTimer);
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
    duplicates = [];
  }

  function close() {
    if (isDirty && !confirm(m.confirm_discard())) return;
    open = false;
    resetForm();
  }

  async function save(addAnother = false) {
    if (!isValid || saving) return;

    saving = true;
    try {
      // All CreatePersonInput fields listed explicitly — when adding new fields
      // to the type, add them here too so nothing is silently dropped.
      const body: CreatePersonInput = {
        sex,
        notes: notes.trim() || undefined,
        names: [{ given: given.trim(), surname: surname.trim(), isPreferred: true }],
        birthDate: birthDate ?? undefined,
        deathDate: deathDate ?? undefined,
      };
      const result = await api.post<{ id: string }>('persons', body);

      if (addAnother) {
        resetForm();
        toastMessage = m.toast_person_created();
        toastType = 'success';
        requestAnimationFrame(() => givenInput?.focus());
      } else {
        open = false;
        resetForm();
        goto(resolveRoute('/persons/[id]', { id: result.id }));
      }
    } catch (e) {
      toastMessage = e instanceof ApiError ? e.message : m.error_generic();
      toastType = 'error';
    } finally {
      saving = false;
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
                  <li>{dup.label}</li>
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
  /* Component-specific styles only — shared modal/form/button styles in global CSS */

  .modal {
    max-width: 520px;
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
</style>
