<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { formatDate, extractYear } from '$lib/utils/date-format';
  import { sortEventsChronologically } from '$lib/utils/event-sort';
  import {
    EVENT_TYPE_EMOJI,
    EVENT_TYPE_NAMES,
    EVENT_TYPE_COLOR,
  } from '$lib/utils/event-type-config';
  import type { Event, Place } from '@ahnenbaum/core';

  let {
    events,
    onDelete,
  }: {
    events: (Event & { place?: Place })[];
    onDelete?: (eventId: string) => void;
  } = $props();

  const sortedEvents = $derived(sortEventsChronologically(events));

  // Separate dated and undated events
  const datedEvents = $derived(sortedEvents.filter((e) => e.date));
  const undatedEvents = $derived(sortedEvents.filter((e) => !e.date));

  import { SvelteSet } from 'svelte/reactivity';

  // Track which cards are expanded
  let expandedIds = new SvelteSet<string>();

  function toggleExpand(id: string) {
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
  }
</script>

<section class="event-timeline">
  <h3>{m.events_title()}</h3>

  {#if sortedEvents.length === 0}
    <p class="empty">{m.events_empty()}</p>
  {:else}
    <div class="timeline">
      <div class="timeline-line" aria-hidden="true"></div>

      {#each datedEvents as event, i (event.id)}
        {@const isLeft = i % 2 === 0}
        {@const color = EVENT_TYPE_COLOR[event.type] ?? 'var(--color-text-muted)'}
        {@const isExpanded = expandedIds.has(event.id)}
        {@const isSpan = !!(event.date && event.endDate)}
        <div
          class="timeline-entry"
          class:left={isLeft}
          class:right={!isLeft}
          style="animation-delay: {i * 60}ms"
        >
          <!-- Date label on the axis -->
          <div class="timeline-year" class:left={isLeft} class:right={!isLeft}>
            {#if isSpan}
              {extractYear(event.date)}–{extractYear(event.endDate)}
            {:else}
              {extractYear(event.date) || ''}
            {/if}
          </div>

          <!-- Dot or span bar on the line -->
          {#if isSpan}
            <div
              class="timeline-span"
              style="background: {color}"
              title="{formatDate(event.date)} – {formatDate(event.endDate)}"
            ></div>
          {:else}
            <div class="timeline-dot" style="background: {color}"></div>
          {/if}

          <!-- Event card -->

          <div
            class="timeline-card"
            class:expanded={isExpanded}
            role="button"
            tabindex="0"
            onclick={() => toggleExpand(event.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpand(event.id);
              }
            }}
          >
            <div class="card-header">
              <span class="card-icon" aria-hidden="true"
                >{EVENT_TYPE_EMOJI[event.type] ?? '📝'}</span
              >
              <span class="card-type">{EVENT_TYPE_NAMES[event.type]?.() ?? event.type}</span>
              {#if event.date}
                <span class="card-date">
                  {formatDate(event.date)}{#if event.endDate}
                    – {formatDate(event.endDate)}{/if}
                </span>
              {/if}
            </div>

            {#if event.place || event.description}
              <div class="card-details">
                {#if event.place}
                  <span class="card-place">📍 {event.place.name}</span>
                {/if}
                {#if event.description}
                  <span class="card-description">{event.description}</span>
                {/if}
              </div>
            {/if}

            {#if isExpanded && event.notes}
              <p class="card-notes">{event.notes}</p>
            {/if}

            {#if isExpanded && onDelete}
              <div class="card-actions">
                <button
                  class="card-delete"
                  onclick={(e) => {
                    e.stopPropagation();
                    onDelete(event.id);
                  }}
                  aria-label={m.event_delete()}
                >
                  🗑️ {m.event_delete()}
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/each}

      {#if undatedEvents.length > 0}
        <div class="undated-section">
          <div class="undated-label">{m.events_date_unknown()}</div>
          {#each undatedEvents as event, i (event.id)}
            {@const color = EVENT_TYPE_COLOR[event.type] ?? 'var(--color-text-muted)'}
            {@const isExpanded = expandedIds.has(event.id)}
            <div
              class="timeline-entry undated"
              style="animation-delay: {(datedEvents.length + i) * 60}ms"
            >
              <div class="timeline-dot" style="background: {color}"></div>

              <div
                class="timeline-card"
                class:expanded={isExpanded}
                role="button"
                tabindex="0"
                onclick={() => toggleExpand(event.id)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(event.id);
                  }
                }}
              >
                <div class="card-header">
                  <span class="card-icon" aria-hidden="true"
                    >{EVENT_TYPE_EMOJI[event.type] ?? '📝'}</span
                  >
                  <span class="card-type">{EVENT_TYPE_NAMES[event.type]?.() ?? event.type}</span>
                </div>

                {#if event.description}
                  <div class="card-details">
                    <span class="card-description">{event.description}</span>
                  </div>
                {/if}

                {#if isExpanded && event.notes}
                  <p class="card-notes">{event.notes}</p>
                {/if}

                {#if isExpanded && onDelete}
                  <div class="card-actions">
                    <button
                      class="card-delete"
                      onclick={(e) => {
                        e.stopPropagation();
                        onDelete(event.id);
                      }}
                      aria-label={m.event_delete()}
                    >
                      🗑️ {m.event_delete()}
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .event-timeline h3 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-4);
  }

  .empty {
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* ── Timeline container ── */
  .timeline {
    position: relative;
    padding: var(--space-4) 0;
  }

  .timeline-line {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--color-border);
    transform: translateX(-50%);
  }

  /* ── Individual entry ── */
  .timeline-entry {
    position: relative;
    display: flex;
    align-items: flex-start;
    margin-bottom: var(--space-6);
    animation: slide-in var(--transition-slow) ease-out both;
  }

  .timeline-entry.left {
    flex-direction: row;
  }

  .timeline-entry.right {
    flex-direction: row-reverse;
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── Year label ── */
  .timeline-year {
    position: absolute;
    top: 4px;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .timeline-year.left {
    right: calc(50% + 20px);
    text-align: right;
  }

  .timeline-year.right {
    left: calc(50% + 20px);
    text-align: left;
  }

  /* ── Dot on the line ── */
  .timeline-dot {
    position: absolute;
    left: 50%;
    top: 8px;
    width: 14px;
    height: 14px;
    border-radius: var(--radius-full);
    border: 3px solid var(--color-surface);
    transform: translateX(-50%);
    z-index: 1;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-fast);
  }

  .timeline-entry:hover .timeline-dot {
    transform: translateX(-50%) scale(1.3);
  }

  /* ── Span bar on the line (for events with endDate) ── */
  .timeline-span {
    position: absolute;
    left: 50%;
    top: 4px;
    width: 10px;
    height: 32px;
    border-radius: var(--radius-md);
    transform: translateX(-50%);
    z-index: 1;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-fast);
    opacity: 0.85;
  }

  .timeline-entry:hover .timeline-span {
    transform: translateX(-50%) scale(1.15);
    opacity: 1;
  }

  /* ── Event card ── */
  .timeline-card {
    width: calc(50% - 28px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
  }

  .timeline-entry.left .timeline-card {
    margin-left: auto;
    margin-right: calc(50% + 18px);
  }

  .timeline-entry.right .timeline-card {
    margin-right: auto;
    margin-left: calc(50% + 18px);
  }

  .timeline-card:hover {
    border-color: var(--color-border-hover);
    box-shadow: var(--shadow-md);
  }

  .timeline-card.expanded {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  }

  /* ── Card content ── */
  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .card-icon {
    font-size: var(--font-size-base);
  }

  .card-type {
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-sm);
  }

  .card-date {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  .card-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .card-notes {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    font-style: italic;
  }

  .card-actions {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .card-delete {
    font-size: var(--font-size-xs);
    color: var(--color-danger);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .card-delete:hover {
    background: var(--color-danger-light);
  }

  /* ── Undated section ── */
  .undated-section {
    margin-top: var(--space-8);
    position: relative;
  }

  .undated-label {
    text-align: center;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-4);
    background: var(--color-bg);
    position: relative;
    z-index: 1;
    margin-bottom: var(--space-4);
  }

  .undated-section .timeline-entry {
    justify-content: center;
  }

  .undated-section .timeline-dot {
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    flex-shrink: 0;
    margin-top: 8px;
  }

  .undated-section .timeline-entry:hover .timeline-dot {
    transform: scale(1.3);
  }

  .undated-section .timeline-card {
    width: auto;
    max-width: 400px;
    margin: 0 0 0 var(--space-3);
  }

  /* ── Mobile: stack cards instead of alternating ── */
  @media (max-width: 768px) {
    .timeline-line {
      left: 20px;
    }

    .timeline-dot {
      left: 20px;
    }

    .timeline-span {
      left: 20px;
    }

    .timeline-year {
      position: relative;
      right: auto;
      left: auto;
      display: block;
      margin-bottom: var(--space-1);
      padding-left: 44px;
    }

    .timeline-year.left,
    .timeline-year.right {
      text-align: left;
      left: auto;
      right: auto;
    }

    .timeline-entry.left,
    .timeline-entry.right {
      flex-direction: row;
    }

    .timeline-entry.left .timeline-card,
    .timeline-entry.right .timeline-card {
      width: auto;
      margin-left: 44px;
      margin-right: 0;
    }
  }
</style>
