<script lang="ts">
  import { fly } from 'svelte/transition';

  let {
    message = '',
    type = 'success' as 'success' | 'error' | 'warning' | 'info',
    duration,
    onUndo,
    onDismiss,
  }: {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onUndo?: () => void;
    onDismiss?: () => void;
  } = $props();

  const effectiveDuration = $derived(duration ?? (onUndo ? 5000 : 3000));

  // Progress bar state (1 → 0 over effectiveDuration)
  let progress = $state(1);

  $effect(() => {
    if (message) {
      progress = 1;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animDuration = prefersReduced ? 0 : effectiveDuration;

      const start = performance.now();
      let rafId: number;

      function tick(now: number) {
        const elapsed = now - start;
        progress = Math.max(0, 1 - elapsed / effectiveDuration);
        if (elapsed < effectiveDuration) {
          rafId = requestAnimationFrame(tick);
        }
      }

      if (animDuration > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        progress = 0;
      }

      const timer = setTimeout(() => {
        onDismiss?.();
      }, effectiveDuration);

      return () => {
        clearTimeout(timer);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  });

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  } as const;

  const colorVarMap = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
    info: 'var(--color-primary)',
  } as const;
</script>

{#if message}
  <div
    class="toast"
    class:error={type === 'error'}
    class:warning={type === 'warning'}
    class:info={type === 'info'}
    role="alert"
    in:fly={{ y: 60, duration: 250 }}
    out:fly={{ y: 60, duration: 200 }}
  >
    <span class="toast-icon">{iconMap[type]}</span>
    <span class="toast-message">{message}</span>
    <div class="toast-actions">
      {#if onUndo}
        <button class="toast-undo" onclick={onUndo}>Undo</button>
      {/if}
      <button class="toast-close" onclick={onDismiss} aria-label="Close">×</button>
    </div>
    <div
      class="toast-progress"
      style:--progress={progress}
      style:--progress-color={colorVarMap[type]}
    ></div>
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
    padding-bottom: calc(var(--space-3) + 3px);
    background: var(--color-surface);
    border: 1px solid var(--color-success);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-toast);
    overflow: hidden;
  }

  .toast.error {
    border-color: var(--color-error);
  }

  .toast.warning {
    border-color: var(--color-warning);
  }

  .toast.info {
    border-color: var(--color-primary);
  }

  .toast-message {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .toast-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .toast-undo {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .toast-undo:hover {
    background: var(--color-primary-light);
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

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    width: calc(var(--progress) * 100%);
    background: var(--progress-color, var(--color-success));
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    transition: width 100ms linear;
  }
</style>
