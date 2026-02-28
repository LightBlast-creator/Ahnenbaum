<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { formatDate } from '$lib/utils/date-format';
  import type { Event, Place } from '@ahnenbaum/core';

  let {
    events,
    onEdit,
    onDelete,
  }: {
    events: (Event & { place?: Place })[];
    onEdit?: (event: Event) => void;
    onDelete?: (eventId: string) => void;
  } = $props();

  const eventTypeLabels: Record<string, string> = {
    birth: '🎂',
    death: '✝',
    marriage: '💍',
    baptism: '💧',
    burial: '⚰️',
    immigration: '🚢',
    emigration: '✈️',
    occupation: '💼',
    residence: '🏠',
    military_service: '🎖️',
    education: '🎓',
    census: '📋',
    custom: '📝',
  };

  const eventTypeNames: Record<string, () => string> = {
    birth: () => m.event_type_birth(),
    death: () => m.event_type_death(),
    marriage: () => m.event_type_marriage(),
    baptism: () => m.event_type_baptism(),
    burial: () => m.event_type_burial(),
    immigration: () => m.event_type_immigration(),
    emigration: () => m.event_type_emigration(),
    occupation: () => m.event_type_occupation(),
    residence: () => m.event_type_residence(),
    military_service: () => m.event_type_military_service(),
    education: () => m.event_type_education(),
    census: () => m.event_type_census(),
    custom: () => m.event_type_custom(),
  };
</script>

<section class="event-list">
  <h3>{m.events_title()}</h3>

  {#if events.length === 0}
    <p class="empty">{m.events_empty()}</p>
  {:else}
    <ul class="events">
      {#each events as event (event.id)}
        <li class="event-item">
          <span class="event-icon" aria-hidden="true">{eventTypeLabels[event.type] ?? '📝'}</span>
          <div class="event-content">
            <div class="event-header">
              <span class="event-type">{eventTypeNames[event.type]?.() ?? event.type}</span>
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
          {#if onEdit || onDelete}
            <div class="event-actions">
              {#if onEdit}
                <button
                  class="action-btn"
                  onclick={() => onEdit(event)}
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
    background: var(--color-danger-light, rgba(239, 68, 68, 0.1));
  }
</style>
