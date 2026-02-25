<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { formatDate } from '$lib/utils/date-format';
  import type { Event, Place } from '@ahnenbaum/core';

  let { events }: { events: (Event & { place?: Place })[] } = $props();

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

  const eventTypeNames: Record<string, string> = {
    birth: 'Birth',
    death: 'Death',
    marriage: 'Marriage',
    baptism: 'Baptism',
    burial: 'Burial',
    immigration: 'Immigration',
    emigration: 'Emigration',
    occupation: 'Occupation',
    residence: 'Residence',
    military_service: 'Military Service',
    education: 'Education',
    census: 'Census',
    custom: 'Event',
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
              <span class="event-type">{eventTypeNames[event.type] ?? event.type}</span>
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
</style>
