<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { getPerson, getEventsForPerson, getRelationshipsForPerson } from '$lib/data/mock-data';
  import { formatLifespan } from '$lib/utils/date-format';
  import EventList from '$lib/components/EventList.svelte';
  import RelationshipList from '$lib/components/RelationshipList.svelte';

  const personId = $derived(page.params.id ?? '');
  const person = $derived(personId ? getPerson(personId) : undefined);
  const events = $derived(person ? getEventsForPerson(person.id) : []);
  const relationships = $derived(person ? getRelationshipsForPerson(person.id) : []);
  const lifespan = $derived(
    person ? formatLifespan(person.birthEvent?.date, person.deathEvent?.date) : '',
  );
  const initials = $derived(
    person
      ? `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`
      : '',
  );
</script>

<svelte:head>
  <title>
    {person
      ? `${person.preferredName.given} ${person.preferredName.surname} | ${m.app_title()}`
      : m.error_not_found()}
  </title>
</svelte:head>

{#if person}
  <div class="person-detail">
    <!-- Header -->
    <header class="person-header">
      <div class="person-avatar">
        <span class="avatar-initials">{initials}</span>
      </div>
      <div class="person-info">
        <h1 class="person-name">
          {person.preferredName.given}
          {person.preferredName.surname}
        </h1>
        {#if lifespan}
          <span class="person-lifespan">{lifespan}</span>
        {/if}
        {#if person.birthPlace}
          <span class="person-place">📍 {person.birthPlace.name}</span>
        {/if}
        {#if person.allNames.length > 1}
          <div class="person-names-alt">
            {#each person.allNames.filter((n) => !n.isPreferred) as name (name.id)}
              <span class="name-badge">
                {name.given}
                {name.surname}
                <small>({name.type})</small>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </header>

    {#if person.notes}
      <section class="person-notes">
        <p>{person.notes}</p>
      </section>
    {/if}

    <div class="person-body">
      <div class="person-main">
        <EventList {events} />
      </div>
      <aside class="person-sidebar">
        <RelationshipList {relationships} />

        <div class="person-meta">
          <a href="{base}/tree?root={person.id}" class="tree-link">
            🌳 {m.nav_tree()}
          </a>
        </div>
      </aside>
    </div>
  </div>
{:else}
  <div class="not-found">
    <h1>{m.error_not_found()}</h1>
    <a href="{base}/persons">{m.error_go_back()}</a>
  </div>
{/if}

<style>
  .person-detail {
    max-width: 1000px;
    margin: 0 auto;
  }

  .person-header {
    display: flex;
    gap: var(--space-6);
    align-items: flex-start;
    padding-bottom: var(--space-6);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-6);
  }

  .person-avatar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-full);
  }

  .avatar-initials {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .person-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .person-name {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
  }

  .person-lifespan {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  .person-place {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .person-names-alt {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-top: var(--space-2);
  }

  .name-badge {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-full);
    color: var(--color-text-secondary);
  }

  .name-badge small {
    color: var(--color-text-muted);
  }

  .person-notes {
    padding: var(--space-4);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-6);
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .person-body {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-8);
  }

  .person-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .person-meta {
    margin-top: var(--space-4);
  }

  .tree-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .tree-link:hover {
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .not-found {
    text-align: center;
    padding: var(--space-16) 0;
  }

  .not-found h1 {
    margin-bottom: var(--space-4);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .person-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .person-body {
      grid-template-columns: 1fr;
    }
  }
</style>
