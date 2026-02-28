<script lang="ts">
  import { fly } from 'svelte/transition';

  let {
    message = '',
    type = 'success' as 'success' | 'error',
    onDismiss,
  }: {
    message: string;
    type?: 'success' | 'error';
    onDismiss?: () => void;
  } = $props();

  $effect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  });
</script>

{#if message}
  <div
    class="toast"
    class:error={type === 'error'}
    role="alert"
    in:fly={{ y: 60, duration: 250 }}
    out:fly={{ y: 60, duration: 200 }}
  >
    <span class="toast-icon">{type === 'error' ? '❌' : '✅'}</span>
    <span class="toast-message">{message}</span>
    <button class="toast-close" onclick={onDismiss} aria-label="Close">×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-toast);
  }

  .toast.error {
    border-color: var(--color-error);
  }

  .toast-message {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .toast-close {
    font-size: var(--font-size-lg);
    color: var(--color-text-muted);
    padding: 0 var(--space-1);
    line-height: 1;
  }

  .toast-close:hover {
    color: var(--color-text);
  }
</style>
