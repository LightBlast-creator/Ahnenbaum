<script lang="ts">
  let {
    icon,
    title,
    description = '',
    actionLabel = '',
    actionHref = '',
    onAction,
  }: {
    icon: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
  } = $props();
</script>

<div class="empty-state">
  <div class="empty-icon" aria-hidden="true">
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {#if icon === 'people'}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <circle
          cx="24"
          cy="24"
          r="6"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <path
          d="M14 42c0-5.5 4.5-10 10-10s10 4.5 10 10"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <circle
          cx="40"
          cy="22"
          r="5"
          stroke="var(--color-primary)"
          stroke-width="2"
          fill="none"
          opacity="0.5"
          stroke-dasharray="3 2"
        />
        <path
          d="M32 40c0-4.4 3.6-8 8-8s8 3.6 8 8"
          stroke="var(--color-primary)"
          stroke-width="2"
          fill="none"
          opacity="0.5"
          stroke-dasharray="3 2"
        />
      {:else if icon === 'search'}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <circle
          cx="28"
          cy="28"
          r="10"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <line
          x1="35"
          y1="35"
          x2="46"
          y2="46"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <line
          x1="24"
          y1="28"
          x2="32"
          y2="28"
          stroke="var(--color-primary)"
          stroke-width="2"
          stroke-linecap="round"
          opacity="0.5"
        />
      {:else if icon === 'tree'}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <line x1="32" y1="46" x2="32" y2="28" stroke="var(--color-text-muted)" stroke-width="2" />
        <path
          d="M24 28c0-4.4 3.6-8 8-8s8 3.6 8 8"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <circle cx="32" cy="18" r="3" fill="var(--color-primary)" opacity="0.5" />
        <circle cx="22" cy="28" r="3" fill="var(--color-primary)" opacity="0.5" />
        <circle cx="42" cy="28" r="3" fill="var(--color-primary)" opacity="0.5" />
      {:else if icon === 'media'}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <rect
          x="18"
          y="20"
          width="28"
          height="24"
          rx="3"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <circle
          cx="26"
          cy="28"
          r="3"
          stroke="var(--color-primary)"
          stroke-width="1.5"
          fill="none"
          opacity="0.6"
        />
        <polyline
          points="18,40 28,32 36,38 40,34 46,40"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {:else if icon === 'events'}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <rect
          x="20"
          y="18"
          width="24"
          height="28"
          rx="3"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          fill="none"
        />
        <line x1="20" y1="26" x2="44" y2="26" stroke="var(--color-text-muted)" stroke-width="2" />
        <line
          x1="26"
          y1="18"
          x2="26"
          y2="22"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <line
          x1="38"
          y1="18"
          x2="38"
          y2="22"
          stroke="var(--color-text-muted)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="32" cy="35" r="2" fill="var(--color-primary)" opacity="0.5" />
      {:else}
        <circle
          cx="32"
          cy="32"
          r="30"
          stroke="var(--color-border)"
          stroke-width="2"
          fill="var(--color-bg-secondary)"
        />
        <text x="32" y="38" text-anchor="middle" font-size="24" fill="var(--color-text-muted)"
          >∅</text
        >
      {/if}
    </svg>
  </div>
  <p class="empty-title">{title}</p>
  {#if description}
    <p class="empty-description">{description}</p>
  {/if}
  {#if actionLabel}
    {#if actionHref}
      <a href={actionHref} class="empty-action">{actionLabel}</a>
    {:else if onAction}
      <button class="empty-action" onclick={onAction}>{actionLabel}</button>
    {/if}
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-12) var(--space-4);
    text-align: center;
    gap: var(--space-3);
  }

  .empty-icon {
    margin-bottom: var(--space-2);
    opacity: 0.8;
  }

  .empty-title {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .empty-description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    max-width: 320px;
  }

  .empty-action {
    margin-top: var(--space-2);
    padding: var(--space-2) var(--space-5);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
    transition: background var(--transition-fast);
  }

  .empty-action:hover {
    background: var(--color-primary-hover);
    color: var(--color-text-inverse);
  }
</style>
