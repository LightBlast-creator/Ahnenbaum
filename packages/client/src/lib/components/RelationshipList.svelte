<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import { formatLifespan } from '$lib/utils/date-format';
  import type { PersonWithDetails } from '$lib/api';
  import type { Relationship } from '@ahnenbaum/core';

  interface RelationshipEntry {
    relationship: Relationship;
    relatedPerson: PersonWithDetails;
    role: 'parent' | 'child' | 'partner';
  }

  let {
    relationships,
    siblings = [],
    extendedFamily,
  }: {
    relationships: RelationshipEntry[];
    siblings?: PersonWithDetails[];
    extendedFamily?: Record<
      string,
      { person: PersonWithDetails; derivedRelationship: string }[]
    > | null;
  } = $props();

  const parents = $derived(relationships.filter((r) => r.role === 'parent'));
  const partners = $derived(relationships.filter((r) => r.role === 'partner'));
  const children = $derived(relationships.filter((r) => r.role === 'child'));
</script>

{#snippet personCard(person: PersonWithDetails)}
  <a href="{base}/persons/{person.id}" class="rel-person">
    <span class="rel-avatar">
      {person.preferredName.given.charAt(0)}{person.preferredName.surname.charAt(0)}
    </span>
    <div class="rel-info">
      <span class="rel-name">{person.preferredName.given} {person.preferredName.surname}</span>
      <span class="rel-dates">
        {formatLifespan(person.birthEvent?.date, person.deathEvent?.date)}
      </span>
    </div>
  </a>
{/snippet}

<section class="relationship-list">
  <h3>{m.relationships_title()}</h3>

  {#if relationships.length === 0 && siblings.length === 0 && (!extendedFamily || Object.values(extendedFamily).every((arr) => arr.length === 0))}
    <p class="empty">{m.relationships_empty()}</p>
  {:else}
    <!-- Immediate Family -->
    {#if parents.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_parents()}</h4>
        {#each parents as { relatedPerson } (relatedPerson.id)}
          {@render personCard(relatedPerson)}
        {/each}
      </div>
    {/if}

    {#if partners.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_partners()}</h4>
        {#each partners as { relatedPerson } (relatedPerson.id)}
          {@render personCard(relatedPerson)}
        {/each}
      </div>
    {/if}

    {#if children.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_children()}</h4>
        {#each children as { relatedPerson } (relatedPerson.id)}
          {@render personCard(relatedPerson)}
        {/each}
      </div>
    {/if}

    {#if siblings.length > 0}
      <div class="rel-group">
        <h4 class="rel-group-title">{m.relationships_siblings()}</h4>
        {#each siblings as sibling (sibling.id)}
          {@render personCard(sibling)}
        {/each}
      </div>
    {/if}

    <!-- Extended Family -->
    {#if extendedFamily && Object.values(extendedFamily).some((arr) => arr.length > 0)}
      <h3 class="extended-title">{m.relationships_extended()}</h3>

      {#if extendedFamily.grandparents?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_grandparents()}</h4>
          {#each extendedFamily.grandparents as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.greatGrandparents?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_great_grandparents()}</h4>
          {#each extendedFamily.greatGrandparents as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.unclesAunts?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_uncles_aunts()}</h4>
          {#each extendedFamily.unclesAunts as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.greatUnclesAunts?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_great_uncles_aunts()}</h4>
          {#each extendedFamily.greatUnclesAunts as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.cousins?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_cousins()}</h4>
          {#each extendedFamily.cousins as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.nephewsNieces?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_nephews_nieces()}</h4>
          {#each extendedFamily.nephewsNieces as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.parentsInLaw?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_parents_in_law()}</h4>
          {#each extendedFamily.parentsInLaw as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.siblingsInLaw?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_siblings_in_law()}</h4>
          {#each extendedFamily.siblingsInLaw as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.childrenInLaw?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_children_in_law()}</h4>
          {#each extendedFamily.childrenInLaw as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}

      {#if extendedFamily.coParentsInLaw?.length > 0}
        <div class="rel-group">
          <h4 class="rel-group-title">{m.relationships_co_parents_in_law()}</h4>
          {#each extendedFamily.coParentsInLaw as { person } (person.id)}
            {@render personCard(person)}
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</section>

<style>
  .relationship-list h3 {
    font-size: var(--font-size-lg);
    margin-bottom: var(--space-4);
  }

  .extended-title {
    font-size: var(--font-size-lg);
    margin-top: var(--space-6);
    margin-bottom: var(--space-4);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
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
