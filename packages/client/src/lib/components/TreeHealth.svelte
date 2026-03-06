<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    missingBirthDate: number;
    orphanPersons: number;
    missingPhoto: number;
  }

  let { missingBirthDate, orphanPersons, missingPhoto }: Props = $props();

  function severity(count: number): 'green' | 'yellow' | 'red' {
    if (count === 0) return 'green';
    if (count <= 5) return 'yellow';
    return 'red';
  }

  const indicators = $derived([
    { icon: '📅', count: missingBirthDate, label: m.dashboard_missing_birth() },
    { icon: '👻', count: orphanPersons, label: m.dashboard_orphan_persons() },
    { icon: '📷', count: missingPhoto, label: m.dashboard_missing_photo() },
  ]);
</script>

<section class="tree-health">
  <h2>{m.dashboard_tree_health()}</h2>
  <div class="health-grid">
    {#each indicators as ind (ind.label)}
      <div class="health-card" data-severity={severity(ind.count)}>
        <span class="health-icon">{ind.icon}</span>
        <span class="health-count">{ind.count}</span>
        <span class="health-label">{ind.label}</span>
      </div>
    {/each}
  </div>
</section>

<style>
  .tree-health {
    margin-bottom: var(--space-6);
  }

  .tree-health h2 {
    font-size: var(--font-size-xl);
    margin-bottom: var(--space-4);
  }

  .health-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .health-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .health-card[data-severity='green'] {
    border-left: 3px solid var(--color-severity-green);
  }

  .health-card[data-severity='yellow'] {
    border-left: 3px solid var(--color-severity-yellow);
  }

  .health-card[data-severity='red'] {
    border-left: 3px solid var(--color-severity-red);
  }

  .health-icon {
    font-size: var(--font-size-lg);
  }

  .health-count {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    line-height: 1;
  }

  .health-card[data-severity='green'] .health-count {
    color: var(--color-severity-green);
  }

  .health-card[data-severity='yellow'] .health-count {
    color: var(--color-severity-yellow);
  }

  .health-card[data-severity='red'] .health-count {
    color: var(--color-severity-red);
  }

  .health-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-align: center;
  }

  @media (max-width: 768px) {
    .health-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
