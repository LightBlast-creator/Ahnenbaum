<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { formatDate } from '$lib/utils/date-format';
  import { parseDate } from '$lib/utils/date-parser';
  import { sortEventsChronologically } from '$lib/utils/event-sort';
  import { EVENT_TYPE_EMOJI, EVENT_TYPE_NAMES, EVENT_TYPES } from '$lib/utils/event-type-config';
  import type { Event, Place, EventType, GenealogyDate } from '@ahnenbaum/core';

  let {
    events,
    onUpdate,
    onDelete,
  }: {
    events: (Event & { place?: Place })[];
    onUpdate?: (
      eventId: string,
      data: { type?: EventType; date?: GenealogyDate; description?: string },
    ) => void;
    onDelete?: (eventId: string) => void;
  } = $props();

  const sortedEvents = $derived(sortEventsChronologically(events));

  // ── Inline editing state ──
  let editingEventId = $state<string | null>(null);
  let editType = $state<EventType>('custom');
  let editDateText = $state('');
  let editDescription = $state('');

  function startEdit(event: Event) {
    editingEventId = event.id;
    editType = event.type;
    editDateText = event.date ? formatDate(event.date) : '';
    editDescription = event.description ?? '';
  }

  function cancelEdit() {
    editingEventId = null;
  }

  function saveEdit() {
    if (!editingEventId || !onUpdate) return;

    const parsedDate = editDateText.trim() ? parseDate(editDateText.trim()) : undefined;

    onUpdate(editingEventId, {
      type: editType,
      date: parsedDate ?? undefined,
      description: editDescription.trim() || undefined,
    });

    editingEventId = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    }
  }
</script>

<section class="event-list">
  <h3>{m.events_title()}</h3>

  {#if sortedEvents.length === 0}
    <p class="empty">{m.events_empty()}</p>
  {:else}
    <ul class="events">
      {#each sortedEvents as event (event.id)}
        <li class="event-item" class:editing={editingEventId === event.id}>
          {#if editingEventId === event.id}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="inline-edit" onkeydown={handleKeydown}>
              <div class="edit-row">
                <select class="edit-select" bind:value={editType}>
                  {#each EVENT_TYPES as et (et.value)}
                    <option value={et.value}>{et.label}</option>
                  {/each}
                </select>
                <input
                  class="edit-input"
                  type="text"
                  bind:value={editDateText}
                  placeholder="1985-03-15, ~1890…"
                />
              </div>
              <input
                class="edit-input edit-description"
                type="text"
                bind:value={editDescription}
                placeholder="Description (optional)"
              />
              <div class="edit-actions">
                <button
                  class="edit-btn edit-btn-save"
                  onclick={saveEdit}
                  aria-label={m.person_save()}
                  title={m.person_save()}
                >
                  ✓
                </button>
                <button
                  class="edit-btn edit-btn-cancel"
                  onclick={cancelEdit}
                  aria-label={m.person_cancel()}
                  title={m.person_cancel()}
                >
                  ✗
                </button>
              </div>
            </div>
          {:else}
            <span class="event-icon" aria-hidden="true">{EVENT_TYPE_EMOJI[event.type] ?? '📝'}</span
            >
            <div class="event-content">
              <div class="event-header">
                <span class="event-type">{EVENT_TYPE_NAMES[event.type]?.() ?? event.type}</span>
                {#if event.date}
                  <span class="event-date">{formatDate(event.date)}</span>
                {/if}
              </div>
              {#if event.place || event.description}
                <div class="event-details">
                  {#if event.place}
                    <span class="event-place">📍 {event.place.name}</span>
                  {/if}
                  {#if event.description}
                    <span class="event-description">{event.description}</span>
                  {/if}
                </div>
              {/if}
              {#if event.notes}
                <p class="event-notes">{event.notes}</p>
              {/if}
            </div>
            {#if onUpdate || onDelete}
              <div class="event-actions">
                {#if onUpdate}
                  <button
                    class="action-btn"
                    onclick={() => startEdit(event)}
                    aria-label={m.event_edit()}
                    title={m.event_edit()}
                  >
                    ✏️
                  </button>
                {/if}
                {#if onDelete}
                  <button
                    class="action-btn action-btn-danger"
                    onclick={() => onDelete(event.id)}
                    aria-label={m.event_delete()}
                    title={m.event_delete()}
                  >
                    🗑️
                  </button>
                {/if}
              </div>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .event-list h3 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-4);
  }

  .empty {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .events {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .event-item {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .event-item:hover {
    background: var(--color-surface-hover);
  }

  .event-item.editing {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .event-icon {
    flex-shrink: 0;
    font-size: var(--font-size-lg);
    line-height: 1;
    margin-top: 2px;
  }

  .event-content {
    flex: 1;
    min-width: 0;
  }

  .event-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .event-type {
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-sm);
  }

  .event-date {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .event-details {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-1);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .event-notes {
    margin-top: var(--space-1);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .event-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .event-item:hover .event-actions {
    opacity: 1;
  }

  .action-btn {
    padding: var(--space-1);
    font-size: var(--font-size-sm);
    line-height: 1;
    border-radius: var(--radius-md);
    opacity: 0.6;
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .action-btn:hover {
    opacity: 1;
    background: var(--color-surface-hover);
  }

  .action-btn-danger:hover {
    background: var(--color-danger-light);
  }

  /* ── Inline Editing ── */
  .inline-edit {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .edit-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .edit-select,
  .edit-input {
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: border-color var(--transition-fast);
  }

  .edit-select:focus,
  .edit-input:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .edit-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .edit-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .edit-btn-save {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .edit-btn-save:hover {
    background: var(--color-primary-hover);
  }

  .edit-btn-cancel {
    color: var(--color-text-secondary);
  }

  .edit-btn-cancel:hover {
    color: var(--color-text);
    background: var(--color-surface-hover);
  }

  @media (max-width: 768px) {
    .edit-row {
      grid-template-columns: 1fr;
    }
  }
</style>
