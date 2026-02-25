<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { parseDate } from '$lib/utils/date-parser';
  import { formatDate } from '$lib/utils/date-format';
  import type { GenealogyDate } from '@ahnenbaum/core';

  let {
    // eslint-disable-next-line no-useless-assignment
    value = $bindable(),
    label = '',
    id = '',
  }: { value: GenealogyDate | undefined; label?: string; id?: string } = $props();

  const inputId = $derived(id || `date-input-${Math.random().toString(36).slice(2, 8)}`);

  let inputText = $state('');
  let parsedDate = $derived(inputText ? parseDate(inputText) : undefined);
  let isInvalid = $derived(inputText.length > 0 && parsedDate === null);

  const typeBadgeLabels: Record<string, () => string> = {
    exact: () => m.date_exact(),
    approximate: () => m.date_approximate(),
    range: () => m.date_range(),
    before: () => m.date_before(),
    after: () => m.date_after(),
  };

  $effect(() => {
    value = parsedDate ?? undefined;
  });
</script>

<div class="date-input-wrapper">
  {#if label}
    <label class="date-label" for={inputId}>{label}</label>
  {/if}
  <div class="date-input-container" class:invalid={isInvalid}>
    <input
      id={inputId}
      type="text"
      class="date-input"
      bind:value={inputText}
      placeholder="1985-03-15, ~1890, before 1900…"
    />
    {#if parsedDate}
      <span
        class="date-badge"
        class:exact={parsedDate.type === 'exact'}
        class:approximate={parsedDate.type === 'approximate'}
        class:range={parsedDate.type === 'range'}
      >
        {typeBadgeLabels[parsedDate.type]?.() ?? parsedDate.type}
      </span>
    {/if}
  </div>
  {#if parsedDate}
    <span class="date-preview">{formatDate(parsedDate)}</span>
  {:else if isInvalid}
    <span class="date-error">{m.date_invalid()}</span>
  {/if}
</div>

<style>
  .date-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .date-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .date-input-container {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0 var(--space-3);
    background: var(--color-surface);
    transition: border-color var(--transition-fast);
  }

  .date-input-container:focus-within {
    border-color: var(--color-primary);
  }

  .date-input-container.invalid {
    border-color: var(--color-error);
  }

  .date-input {
    flex: 1;
    padding: var(--space-2) 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: var(--font-size-sm);
  }

  .date-badge {
    flex-shrink: 0;
    font-size: var(--font-size-xs);
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-weight: var(--font-weight-medium);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .date-badge.exact {
    background: #dcfce7;
    color: #166534;
  }

  :global([data-theme='dark']) .date-badge.exact {
    background: #14532d;
    color: #86efac;
  }

  .date-badge.approximate {
    background: #fef3c7;
    color: #92400e;
  }

  :global([data-theme='dark']) .date-badge.approximate {
    background: #78350f;
    color: #fde68a;
  }

  .date-badge.range {
    background: #dbeafe;
    color: #1e40af;
  }

  :global([data-theme='dark']) .date-badge.range {
    background: #1e3a5f;
    color: #93c5fd;
  }

  .date-preview {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .date-error {
    font-size: var(--font-size-xs);
    color: var(--color-error);
  }
</style>
