<script lang="ts">
  import { formatLifespan } from '$lib/utils/date-format';
  import type { PersonWithDetails } from '$lib/api';
  import { CARD_WIDTH, CARD_HEIGHT } from '$lib/utils/tree-constants';

  let {
    person,
    x,
    y,
    generation,
    onClick,
    onDoubleClick,
  }: {
    person: PersonWithDetails;
    x: number;
    y: number;
    generation?: number;
    onClick?: (personId: string) => void;
    onDoubleClick?: (personId: string) => void;
  } = $props();

  const initials = $derived(
    `${person.preferredName.given.charAt(0)}${person.preferredName.surname.charAt(0)}`,
  );
  const lifespan = $derived(formatLifespan(person.birthEvent?.date, person.deathEvent?.date));
  const displayName = $derived(`${person.preferredName.given} ${person.preferredName.surname}`);

  const MAX_DISPLAY_NAME_LENGTH = 20;

  // ── Click / double-click discrimination ──────────────────────────
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  function handleClick() {
    if (!onClick) return;
    // Delay single-click to allow dblclick to cancel it
    clickTimer = setTimeout(() => {
      clickTimer = null;
      onClick(person.id);
    }, 250);
  }

  function handleDblClick() {
    // Cancel pending single-click
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
    onDoubleClick?.(person.id);
  }
</script>

<g
  class="person-card"
  transform="translate({x - CARD_WIDTH / 2}, {y - CARD_HEIGHT / 2})"
  role="button"
  tabindex="0"
  onclick={handleClick}
  ondblclick={handleDblClick}
  onkeydown={(e) => {
    if (e.key === 'Enter') onClick?.(person.id);
  }}
  aria-label={displayName}
>
  <!-- Card background -->
  <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx="8" ry="8" class="card-bg" />

  <!-- Avatar circle -->
  <defs>
    <clipPath id="avatar-clip-{person.id}">
      <circle cx="34" cy={CARD_HEIGHT / 2} r="18" />
    </clipPath>
  </defs>
  {#if person.primaryPhotoUrl}
    <image
      href={person.primaryPhotoUrl}
      x="16"
      y={CARD_HEIGHT / 2 - 18}
      width="36"
      height="36"
      clip-path="url(#avatar-clip-{person.id})"
      preserveAspectRatio="xMidYMid slice"
    />
  {:else}
    <circle cx="34" cy={CARD_HEIGHT / 2} r="18" class="card-avatar" />
    <text x="34" y={CARD_HEIGHT / 2 + 5} text-anchor="middle" class="card-initials">
      {initials}
    </text>
  {/if}

  <!-- Name and dates -->
  <text x="62" y={CARD_HEIGHT / 2 - 6} class="card-name">
    {displayName.length > MAX_DISPLAY_NAME_LENGTH
      ? displayName.slice(0, MAX_DISPLAY_NAME_LENGTH - 1) + '…'
      : displayName}
  </text>
  {#if lifespan}
    <text x="62" y={CARD_HEIGHT / 2 + 12} class="card-dates">
      {lifespan}
    </text>
  {/if}

  <!-- Generation badge -->
  {#if generation !== undefined}
    <text x={CARD_WIDTH - 10} y="16" text-anchor="end" class="card-gen-badge">
      G{generation}
    </text>
  {/if}
</g>

<style>
  .person-card {
    cursor: pointer;
  }

  .person-card:hover .card-bg {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
    stroke: var(--color-primary-light);
  }

  .person-card:focus-visible .card-bg {
    stroke: var(--color-primary);
    stroke-width: 2;
  }

  .card-bg {
    fill: var(--color-surface);
    stroke: var(--color-border);
    stroke-width: 1.5;
    filter: drop-shadow(0 3px 12px rgba(0, 0, 0, 0.35));
    transition:
      filter 200ms ease,
      stroke 200ms ease;
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

  .card-gen-badge {
    fill: var(--color-text-muted);
    font-size: 9px;
    font-weight: 600;
    font-family: var(--font-mono);
    opacity: 0.6;
  }
</style>
