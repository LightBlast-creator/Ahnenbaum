<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api, ApiError, toPersonWithDetails, type PersonWithDetails } from '$lib/api';
  import Toast from '$lib/components/Toast.svelte';

  let {
    open = $bindable(false),
    currentPersonId,
    onSaved,
  }: {
    open: boolean;
    currentPersonId: string;
    onSaved?: () => void;
  } = $props();

  // ── Constants ──

  const PARENT_CHILD_TYPES = [
    'biological_parent',
    'adoptive_parent',
    'step_parent',
    'foster_parent',
    'guardian',
    'godparent',
  ] as const;

  const PARTNER_TYPES = [
    'marriage',
    'civil_partnership',
    'domestic_partnership',
    'cohabitation',
    'engagement',
    'custom',
  ] as const;

  type RelType = (typeof PARENT_CHILD_TYPES)[number] | (typeof PARTNER_TYPES)[number];

  const TYPE_LABELS: Record<RelType, string> = {
    biological_parent: 'Biological Parent',
    adoptive_parent: 'Adoptive Parent',
    step_parent: 'Step Parent',
    foster_parent: 'Foster Parent',
    guardian: 'Guardian',
    godparent: 'Godparent',
    marriage: 'Marriage',
    civil_partnership: 'Civil Partnership',
    domestic_partnership: 'Domestic Partnership',
    cohabitation: 'Cohabitation',
    engagement: 'Engagement',
    custom: 'Custom',
  };

  // ── Form state ──

  let selectedPersonId = $state('');
  let selectedType: RelType = $state('biological_parent');
  /** For parent-child types: 'parent' means selected person IS parent of current. */
  let direction: 'parent' | 'child' = $state('parent');

  // ── UI state ──

  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');
  let saving = $state(false);
  let availablePersons = $state<PersonWithDetails[]>([]);
  let loadingPersons = $state(false);

  // ── Derived ──

  const isParentChildType = $derived(
    (PARENT_CHILD_TYPES as readonly string[]).includes(selectedType),
  );
  const isValid = $derived(selectedPersonId.length > 0);

  // ── Load available persons ──

  $effect(() => {
    if (open) {
      loadAvailablePersons();
    }
  });

  async function loadAvailablePersons() {
    loadingPersons = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await api.get<{ persons: any[]; total: number }>('persons', {
        page: 1,
        limit: 100,
      });
      availablePersons = data.persons
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((p: any) => toPersonWithDetails(p))
        .filter((p) => p.id !== currentPersonId);
    } catch {
      availablePersons = [];
    }
    loadingPersons = false;
  }

  // ── Actions ──

  function resetForm() {
    selectedPersonId = '';
    selectedType = 'biological_parent';
    direction = 'parent';
  }

  function close() {
    open = false;
    resetForm();
  }

  async function save() {
    if (!isValid || saving) return;

    saving = true;
    try {
      // For parent-child types:
      //   direction='parent' → personA=selectedPerson (parent), personB=currentPerson (child)
      //   direction='child'  → personA=currentPerson (parent), personB=selectedPerson (child)
      // For partner types: order doesn't matter semantically
      let personAId: string;
      let personBId: string;

      if (isParentChildType) {
        if (direction === 'parent') {
          personAId = selectedPersonId;
          personBId = currentPersonId;
        } else {
          personAId = currentPersonId;
          personBId = selectedPersonId;
        }
      } else {
        personAId = currentPersonId;
        personBId = selectedPersonId;
      }

      await api.post('relationships', {
        personAId,
        personBId,
        type: selectedType,
      });

      toastMessage = m.toast_relationship_created();
      toastType = 'success';
      close();
      onSaved?.();
    } catch (e) {
      toastMessage = e instanceof ApiError ? e.message : m.toast_relationship_error();
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
      save();
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
      aria-label={m.relationship_add()}
      tabindex="-1"
    >
      <div class="modal-header">
        <h2>{m.relationship_add()}</h2>
        <button class="modal-close" onclick={close} aria-label={m.shortcuts_close()}>×</button>
      </div>

      <div class="modal-body">
        <!-- Person picker -->
        <div class="form-field">
          <label for="rel-person">{m.relationship_person()}</label>
          {#if loadingPersons}
            <select id="rel-person" disabled>
              <option>…</option>
            </select>
          {:else}
            <select id="rel-person" bind:value={selectedPersonId}>
              <option value="" disabled>— {m.relationship_person()} —</option>
              {#each availablePersons as p (p.id)}
                <option value={p.id}>{p.preferredName.given} {p.preferredName.surname}</option>
              {/each}
            </select>
          {/if}
        </div>

        <!-- Type selector -->
        <div class="form-field">
          <label for="rel-type">{m.relationship_type()}</label>
          <select id="rel-type" bind:value={selectedType}>
            <optgroup label={m.relationships_parents()}>
              {#each PARENT_CHILD_TYPES as t (t)}
                <option value={t}>{TYPE_LABELS[t]}</option>
              {/each}
            </optgroup>
            <optgroup label={m.relationships_partners()}>
              {#each PARTNER_TYPES as t (t)}
                <option value={t}>{TYPE_LABELS[t]}</option>
              {/each}
            </optgroup>
          </select>
        </div>

        <!-- Direction helper (only for parent-child types) -->
        {#if isParentChildType}
          {@const selectedName =
            availablePersons.find((p) => p.id === selectedPersonId)?.preferredName.given ??
            m.relationship_person()}
          <fieldset class="direction-fieldset">
            <legend>{m.relationship_direction()}</legend>
            <label class="direction-option">
              <input type="radio" bind:group={direction} value="parent" />
              <span>{m.relationship_is_parent({ name: selectedName })}</span>
            </label>
            <label class="direction-option">
              <input type="radio" bind:group={direction} value="child" />
              <span>{m.relationship_is_child({ name: selectedName })}</span>
            </label>
          </fieldset>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick={close}>
          {m.person_cancel()}
        </button>
        <button class="btn-primary" onclick={save} disabled={!isValid || saving}>
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
    max-width: 480px;
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

  .form-field select {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: border-color var(--transition-fast);
  }

  .form-field select:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .direction-fieldset {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
  }

  .direction-fieldset legend {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    padding: 0 var(--space-1);
  }

  .direction-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .direction-option input[type='radio'] {
    accent-color: var(--color-primary);
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

  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop {
      animation: none;
    }

    .modal {
      animation: none;
    }
  }
</style>
