<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { formatLifespan } from '$lib/utils/date-format';
  import type { PersonWithDetails } from '$lib/data/mock-data';
  import type { Relationship } from '@ahnenbaum/core';

  interface RelationshipEntry {
    relationship: Relationship;
    relatedPerson: PersonWithDetails;
    role: 'parent' | 'child' | 'partner';
  }

  let { relationships }: { relationships: RelationshipEntry[] } = $props();

  const parents = $derived(relationships.filter((r) => r.role === 'parent'));
  const partners = $derived(relationships.filter((r) => r.role === 'partner'));
  const children = $derived(relationships.filter((r) => r.role === 'child'));
</script>

<section class="relationship-list">
  <h3>{m.relationships_title()}</h3>

  {#if relationships.length === 0}
    <p class="empty">{m.relationships_empty()}</p>
  {:else}
    {#if parents.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_parents()}</h4>
        {#each parents as { relatedPerson } (relatedPerson.id)}
          <a href="{base}/persons/{relatedPerson.id}" class="rel-person">
            <span class="rel-avatar">
              {relatedPerson.preferredName.given.charAt(
                0,
              )}{relatedPerson.preferredName.surname.charAt(0)}
            </span>
            <div class="rel-info">
              <span class="rel-name"
                >{relatedPerson.preferredName.given} {relatedPerson.preferredName.surname}</span
              >
              <span class="rel-dates"
                >{formatLifespan(
                  relatedPerson.birthEvent?.date,
                  relatedPerson.deathEvent?.date,
                )}</span
              >
            </div>
          </a>
        {/each}
      </div>
    {/if}

    {#if partners.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_partners()}</h4>
        {#each partners as { relatedPerson } (relatedPerson.id)}
          <a href="{base}/persons/{relatedPerson.id}" class="rel-person">
            <span class="rel-avatar">
              {relatedPerson.preferredName.given.charAt(
                0,
              )}{relatedPerson.preferredName.surname.charAt(0)}
            </span>
            <div class="rel-info">
              <span class="rel-name"
                >{relatedPerson.preferredName.given} {relatedPerson.preferredName.surname}</span
              >
              <span class="rel-dates"
                >{formatLifespan(
                  relatedPerson.birthEvent?.date,
                  relatedPerson.deathEvent?.date,
                )}</span
              >
            </div>
          </a>
        {/each}
      </div>
    {/if}

    {#if children.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_children()}</h4>
        {#each children as { relatedPerson } (relatedPerson.id)}
          <a href="{base}/persons/{relatedPerson.id}" class="rel-person">
            <span class="rel-avatar">
              {relatedPerson.preferredName.given.charAt(
                0,
              )}{relatedPerson.preferredName.surname.charAt(0)}
            </span>
            <div class="rel-info">
              <span class="rel-name"
                >{relatedPerson.preferredName.given} {relatedPerson.preferredName.surname}</span
              >
              <span class="rel-dates"
                >{formatLifespan(
                  relatedPerson.birthEvent?.date,
                  relatedPerson.deathEvent?.date,
                )}</span
              >
            </div>
          </a>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .relationship-list h3 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-4);
  }

  .empty {
    color: var(--color-text-muted);
    font-style: italic;
  }

  .rel-group {
    margin-bottom: var(--space-4);
  }

  .rel-group-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .rel-person {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .rel-person:hover {
    background: var(--color-surface-hover);
  }

  .rel-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    flex-shrink: 0;
  }

  .rel-info {
    display: flex;
    flex-direction: column;
  }

  .rel-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .rel-dates {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
</style>
