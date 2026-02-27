<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    open = $bindable(false),
    title = '',
    message = '',
    confirmLabel = '',
    cancelLabel = '',
    variant = 'danger',
    onConfirm,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
  } = $props();

  const resolvedCancelLabel = $derived(cancelLabel || m.person_cancel());

  function close() {
    open = false;
  }

  function confirm() {
    onConfirm();
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      confirm();
    }
  }
</script>

{#if open}
  <div class="confirm-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="confirm-dialog"
      class:danger={variant === 'danger'}
      class:warning={variant === 'warning'}
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
    >
      <div class="confirm-icon">
        {#if variant === 'danger'}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        {:else}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        {/if}
      </div>

      <h3 class="confirm-title">{title}</h3>
      <p class="confirm-message">{message}</p>

      <div class="confirm-actions">
        <button class="btn-cancel" onclick={close}>
          {resolvedCancelLabel}
        </button>
        <button class="btn-confirm" onclick={confirm}>
          {confirmLabel || m.person_delete()}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-4);
    animation: fade-in 150ms ease;
  }

  .confirm-dialog {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 400px;
    padding: var(--space-8) var(--space-6) var(--space-6);
    text-align: center;
    animation: scale-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .confirm-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    margin-bottom: var(--space-4);
  }

  .danger .confirm-icon {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .warning .confirm-icon {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }

  .confirm-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-2);
  }

  .confirm-message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: var(--space-6);
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-3);
  }

  .btn-cancel,
  .btn-confirm {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
    cursor: pointer;
  }

  .btn-cancel {
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
  }

  .btn-cancel:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .danger .btn-confirm {
    background: #ef4444;
    color: white;
  }

  .danger .btn-confirm:hover {
    background: #dc2626;
  }

  .warning .btn-confirm {
    background: #f59e0b;
    color: white;
  }

  .warning .btn-confirm:hover {
    background: #d97706;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-in {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .confirm-backdrop {
      animation: none;
    }
    .confirm-dialog {
      animation: none;
    }
  }
</style>
