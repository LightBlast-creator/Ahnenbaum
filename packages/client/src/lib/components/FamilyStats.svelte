<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    surnameDistribution: { surname: string; count: number }[];
    personsByCentury: { century: string; count: number }[];
    earliestBirthYear: number | null;
    latestBirthYear: number | null;
    averageLifespan: number | null;
  }

  let {
    surnameDistribution,
    personsByCentury,
    earliestBirthYear,
    latestBirthYear,
    averageLifespan,
  }: Props = $props();

  const maxSurnameCount = $derived(
    surnameDistribution.length > 0 ? Math.max(...surnameDistribution.map((s) => s.count)) : 1,
  );

  const maxCenturyCount = $derived(
    personsByCentury.length > 0 ? Math.max(...personsByCentury.map((c) => c.count)) : 1,
  );
</script>

<section class="family-stats">
  <h2>{m.dashboard_family_stats()}</h2>

  <div class="stats-grid">
    <!-- Surname distribution -->
    {#if surnameDistribution.length > 0}
      <div class="stats-card">
        <h3>{m.dashboard_top_surnames()}</h3>
        <div class="bar-chart">
          {#each surnameDistribution.slice(0, 5) as item (item.surname)}
            <div class="bar-row">
              <span class="bar-label">{item.surname}</span>
              <div class="bar-track">
                <div class="bar-fill" style:width="{(item.count / maxSurnameCount) * 100}%"></div>
              </div>
              <span class="bar-value">{item.count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Persons by century -->
    {#if personsByCentury.length > 0}
      <div class="stats-card">
        <h3>{m.dashboard_by_century()}</h3>
        <div class="bar-chart">
          {#each personsByCentury as item (item.century)}
            <div class="bar-row">
              <span class="bar-label">{item.century}</span>
              <div class="bar-track">
                <div
                  class="bar-fill accent"
                  style:width="{(item.count / maxCenturyCount) * 100}%"
                ></div>
              </div>
              <span class="bar-value">{item.count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Generation span -->
    {#if earliestBirthYear && latestBirthYear}
      <div class="stats-card stat-compact">
        <h3>{m.dashboard_generation_span()}</h3>
        <p class="stat-big">{earliestBirthYear} — {latestBirthYear}</p>
      </div>
    {/if}

    <!-- Average lifespan -->
    {#if averageLifespan != null}
      <div class="stats-card stat-compact">
        <h3>{m.dashboard_avg_lifespan()}</h3>
        <p class="stat-big">{averageLifespan} <span class="stat-unit">years</span></p>
      </div>
    {/if}
  </div>
</section>

<style>
  .family-stats {
    margin-bottom: var(--space-6);
  }

  .family-stats h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-4);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .stats-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .stats-card h3 {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    margin-bottom: var(--space-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .bar-chart {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .bar-row {
    display: grid;
    grid-template-columns: 80px 1fr 30px;
    align-items: center;
    gap: var(--space-2);
  }

  .bar-label {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bar-track {
    height: 8px;
    background: var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: var(--radius-full);
    transition: width 600ms ease-out;
  }

  .bar-fill.accent {
    background: var(--color-secondary);
  }

  .bar-value {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: right;
  }

  .stat-compact {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .stat-big {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    line-height: 1.2;
  }

  .stat-unit {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-normal);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
