<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import DateInput from '$lib/components/DateInput.svelte';
  import type { GenealogyDate, EventType } from '@ahnenbaum/core';

  let {
    onSave,
    onCancel,
  }: {
    onSave: (data: { type: EventType; date?: GenealogyDate; description?: string }) => void;
    onCancel: () => void;
  } = $props();

  let type: EventType = $state('custom');
  let date: GenealogyDate | undefined = $state(undefined);
  let description = $state('');

  const eventTypes: { value: EventType; label: string }[] = [
    { value: 'birth', label: '🎂 Birth' },
    { value: 'death', label: '✝ Death' },
    { value: 'marriage', label: '💍 Marriage' },
    { value: 'baptism', label: '💧 Baptism' },
    { value: 'burial', label: '⚰️ Burial' },
    { value: 'immigration', label: '🚢 Immigration' },
    { value: 'emigration', label: '✈️ Emigration' },
    { value: 'occupation', label: '💼 Occupation' },
    { value: 'residence', label: '🏠 Residence' },
    { value: 'military_service', label: '🎖️ Military' },
    { value: 'education', label: '🎓 Education' },
    { value: 'census', label: '📋 Census' },
    { value: 'custom', label: '📝 Custom' },
  ];

  function handleSave() {
    onSave({
      type,
      date,
      description: description.trim() || undefined,
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="event-form" onkeydown={handleKeydown}>
  <h4>{m.event_add()}</h4>
  <div class="form-row">
    <div class="form-field">
      <label for="event-type">Type</label>
      <select id="event-type" bind:value={type}>
        {#each eventTypes as et (et.value)}
          <option value={et.value}>{et.label}</option>
        {/each}
      </select>
    </div>
    <div class="form-field">
      <DateInput bind:value={date} label="Date" />
    </div>
  </div>
  <div class="form-field">
    <label for="event-desc">Description</label>
    <input id="event-desc" type="text" bind:value={description} placeholder="Optional" />
  </div>
  <div class="form-actions">
    <button class="btn-cancel" onclick={onCancel}>{m.person_cancel()}</button>
    <button class="btn-save" onclick={handleSave}>{m.person_save()}</button>
  </div>
</div>

<style>
  .event-form {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .event-form h4 {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-field label {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .form-field input,
  .form-field select {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: border-color var(--transition-fast);
  }

  .form-field input:focus,
  .form-field select:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .btn-cancel,
  .btn-save {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .btn-cancel {
    color: var(--color-text-secondary);
  }

  .btn-cancel:hover {
    color: var(--color-text);
  }

  .btn-save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .btn-save:hover {
    background: var(--color-primary-hover);
  }

  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
