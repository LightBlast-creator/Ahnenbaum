<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import {
    api,
    toPersonWithDetails,
    type ServerPersonResponse,
    type PersonWithDetails,
  } from '$lib/api';
  import PluginSlot from '$lib/plugin-slots/PluginSlot.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import SkeletonLoader from '$lib/components/SkeletonLoader.svelte';
  import { formatLifespan } from '$lib/utils/date-format';

  let personCount = $state(0);
  let mediaCount = $state(0);
  let recentPersons = $state<PersonWithDetails[]>([]);
  let loading = $state(true);

  async function loadDashboardData() {
    loading = true;
    try {
      const [personsData, mediaData] = await Promise.all([
        api.get<{ persons: ServerPersonResponse[]; total: number }>('persons', {
          page: 1,
          limit: 5,
        }),
        api.get<{ media: unknown[]; total: number }>('media', { limit: 1 }),
      ]);
      personCount = personsData.total;
      mediaCount = mediaData.total;
      recentPersons = personsData.persons.map((p) => toPersonWithDetails(p));
    } catch {
      personCount = 0;
      mediaCount = 0;
      recentPersons = [];
    }
    loading = false;
  }

  $effect(() => {
    loadDashboardData();
  });

  const hasData = $derived(personCount > 0);
</script>

<svelte:head>
  <title>{m.dashboard_welcome()} | {m.app_title()}</title>
</svelte:head>

<div class="dashboard">
  <section class="dashboard-hero">
    <h1>{m.dashboard_welcome()}</h1>
    <p class="dashboard-subtitle">{m.app_title()}</p>
  </section>

  {#if loading}
    <SkeletonLoader variant="card" count={2} />
  {:else if !hasData}
    <!-- First-time user onboarding -->
    <EmptyState
      icon="tree"
      title={m.dashboard_add_first()}
      actionLabel={m.person_add()}
      onAction={() => {
        const event = new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true });
        window.dispatchEvent(event);
      }}
    />
  {:else}
    <!-- Stats cards -->
    <section class="dashboard-stats">
      <a href="{base}/persons" class="stat-card">
        <span class="stat-icon">👤</span>
        <span class="stat-value">{personCount}</span>
        <span class="stat-label">{m.nav_people()}</span>
      </a>
      <a href="{base}/media" class="stat-card">
        <span class="stat-icon">🖼️</span>
        <span class="stat-value">{mediaCount}</span>
        <span class="stat-label">{m.nav_media()}</span>
      </a>
      <a href="{base}/tree" class="stat-card">
        <span class="stat-icon">🌳</span>
        <span class="stat-value">&rarr;</span>
        <span class="stat-label">{m.dashboard_view_tree()}</span>
      </a>
    </section>

    <!-- Recent persons -->
    {#if recentPersons.length > 0}
      <section class="dashboard-recent">
        <div class="recent-header">
          <h2>{m.nav_people()}</h2>
          <a href="{base}/persons" class="view-all">{m.dashboard_browse()} →</a>
        </div>
        <div class="recent-list">
          {#each recentPersons as person (person.id)}
            <a href="{base}/persons/{person.id}" class="recent-card">
              <div class="recent-avatar">
                {#if person.primaryPhotoUrl}
                  <img src={person.primaryPhotoUrl} alt="" class="recent-avatar-photo" />
                {:else}
                  <span class="recent-avatar-initials">
                    {person.preferredName.given.charAt(0)}{person.preferredName.surname.charAt(0)}
                  </span>
                {/if}
              </div>
              <div class="recent-info">
                <span class="recent-name">
                  {person.preferredName.given}
                  {person.preferredName.surname}
                </span>
                <span class="recent-dates">
                  {formatLifespan(person.birthEvent?.date, person.deathEvent?.date)}
                </span>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}
  {/if}

  <!-- Quick actions -->
  <section class="dashboard-actions">
    <h2>{m.dashboard_quick_actions()}</h2>
    <div class="action-cards">
      <a href="{base}/persons" class="action-card">
        <span class="action-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle
              cx="9"
              cy="7"
              r="4"
            /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
          >
        </span>
        <span class="action-label">{m.dashboard_browse()}</span>
      </a>

      <a href="{base}/tree" class="action-card">
        <span class="action-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0 0 20 0h-3" /><path
              d="M8 8a4 4 0 1 1 8 0"
            /></svg
          >
        </span>
        <span class="action-label">{m.dashboard_view_tree()}</span>
      </a>
    </div>
  </section>

  <section class="dashboard-plugins">
    <PluginSlot slot="dashboard.widget" />
  </section>
</div>

<style>
  .dashboard {
    max-width: 800px;
    margin: 0 auto;
  }

  .dashboard-hero {
    text-align: center;
    padding: var(--space-10) 0 var(--space-6);
  }

  .dashboard-hero h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dashboard-subtitle {
    margin-top: var(--space-2);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }

  /* ── Stats ── */
  .dashboard-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-5);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-base);
  }

  .stat-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .stat-icon {
    font-size: var(--font-size-xl);
  }

  .stat-value {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Recent ── */
  .dashboard-recent {
    margin-bottom: var(--space-6);
  }

  .recent-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .recent-header h2 {
    font-size: var(--font-size-xl);
  }

  .view-all {
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    text-decoration: none;
  }

  .view-all:hover {
    text-decoration: underline;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .recent-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-fast);
  }

  .recent-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
  }

  .recent-avatar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    border-radius: var(--radius-full);
  }

  .recent-avatar-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-full);
  }

  .recent-avatar-initials {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: white;
  }

  .recent-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .recent-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-dates {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* ── Quick Actions ── */
  .dashboard-actions {
    padding: var(--space-6) 0;
  }

  .dashboard-actions h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-4);
  }

  .action-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-4);
  }

  .action-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: var(--color-text);
    transition: all var(--transition-base);
  }

  .action-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--color-primary-light);
    border-radius: var(--radius-xl);
    color: var(--color-primary);
  }

  .action-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  @media (max-width: 768px) {
    .dashboard-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
