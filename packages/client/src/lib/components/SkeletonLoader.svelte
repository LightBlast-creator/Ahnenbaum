<script lang="ts">
  let {
    variant = 'text',
    count = 1,
  }: {
    variant?: 'card' | 'row' | 'text';
    count?: number;
  } = $props();
</script>

<div class="skeleton-container" aria-busy="true" aria-label="Loading">
  {#each Array(count) as _, idx (idx)}
    <div
      class="skeleton"
      class:card={variant === 'card'}
      class:row={variant === 'row'}
      class:text={variant === 'text'}
    ></div>
  {/each}
</div>

<style>
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-bg-secondary) 25%,
      var(--color-surface-hover) 50%,
      var(--color-bg-secondary) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-md);
  }

  .skeleton.text {
    height: 16px;
    width: 80%;
  }

  .skeleton.text:nth-child(2n) {
    width: 60%;
  }

  .skeleton.row {
    height: 48px;
    width: 100%;
  }

  .skeleton.card {
    height: 120px;
    width: 100%;
    border-radius: var(--radius-lg);
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
    }
  }
</style>
