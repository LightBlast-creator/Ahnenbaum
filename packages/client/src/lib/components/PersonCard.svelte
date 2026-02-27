<script lang="ts">
  import { formatLifespan } from '$lib/utils/date-format';
  import type { PersonWithDetails } from '$lib/api';

  let {
    person,
    x,
    y,
    onClick,
  }: {
    person: PersonWithDetails;
    x: number;
    y: number;
    onClick?: (personId: string) => void;
  } = $props();

  const initials = $derived(
    `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`,
  );
  const lifespan = $derived(formatLifespan(person.birthEvent?.date, person.deathEvent?.date));
  const displayName = $derived(`${person.preferredName.given} ${person.preferredName.surname}`);

  const CARD_WIDTH = 160;
  const CARD_HEIGHT = 80;
</script>

<g
  class="person-card"
  transform="translate({x - CARD_WIDTH / 2}, {y - CARD_HEIGHT / 2})"
  role="button"
  tabindex="0"
  onclick={() => onClick?.(person.id)}
  onkeydown={(e) => {
    if (e.key === 'Enter') onClick?.(person.id);
  }}
  aria-label={displayName}
>
  <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx="8" ry="8" class="card-bg" />

  <!-- Avatar circle -->
  <circle cx="30" cy={CARD_HEIGHT / 2} r="18" class="card-avatar" />
  <text x="30" y={CARD_HEIGHT / 2 + 5} text-anchor="middle" class="card-initials">
    {initials}
  </text>

  <!-- Name and dates -->
  <text x="56" y={CARD_HEIGHT / 2 - 6} class="card-name">
    {displayName.length > 16 ? displayName.slice(0, 15) + '…' : displayName}
  </text>
  {#if lifespan}
    <text x="56" y={CARD_HEIGHT / 2 + 12} class="card-dates">
      {lifespan}
    </text>
  {/if}
</g>

<style>
  .person-card {
    cursor: pointer;
  }

  .person-card:hover .card-bg {
    filter: brightness(0.95);
  }

  .person-card:focus-visible .card-bg {
    stroke: var(--color-primary);
    stroke-width: 2;
  }

  .card-bg {
    fill: var(--color-surface);
    stroke: var(--color-border);
    stroke-width: 1;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1));
    transition: filter 150ms ease;
  }

  .card-avatar {
    fill: var(--color-primary-light);
  }

  .card-initials {
    fill: var(--color-primary);
    font-size: 12px;
    font-weight: 600;
    font-family: var(--font-family);
  }

  .card-name {
    fill: var(--color-text);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-family);
  }

  .card-dates {
    fill: var(--color-text-muted);
    font-size: 11px;
    font-family: var(--font-family);
  }
</style>
