<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let { open = $bindable(false) }: { open: boolean } = $props();

  const shortcuts = [
    { keys: '⌘K', label: () => m.shortcuts_search(), category: 'Navigation' },
    { keys: '⌘N', label: () => m.shortcuts_add_person(), category: 'Navigation' },
    { keys: '?', label: () => m.shortcuts_help(), category: 'Navigation' },
    { keys: 'Esc', label: () => m.shortcuts_close(), category: 'Navigation' },
  ];

  function close() {
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }
</script>

{#if open}
  <div class="overlay-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="overlay"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={m.shortcuts_title()}
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      <div class="overlay-header">
        <h2>{m.shortcuts_title()}</h2>
        <button class="overlay-close" onclick={close} aria-label={m.shortcuts_close()}>×</button>
      </div>

      <div class="overlay-body">
        <dl class="shortcuts-list">
          {#each shortcuts as shortcut (shortcut.keys)}
            <div class="shortcut-item">
              <dt><kbd>{shortcut.keys}</kbd></dt>
              <dd>{shortcut.label()}</dd>
            </div>
          {/each}
        </dl>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    animation: fade-in 100ms ease;
  }

  .overlay {
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    width: 100%;
    max-width: 400px;
    animation: scale-in 150ms ease;
  }

  .overlay-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
  }

  .overlay-header h2 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .overlay-close {
    font-size: var(--font-size-2xl);
    color: var(--color-text-muted);
    line-height: 1;
  }

  .overlay-close:hover {
    color: var(--color-text);
  }

  .overlay-body {
    padding: var(--space-4) var(--space-6);
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  dt {
    display: flex;
    gap: var(--space-1);
  }

  kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    min-width: 28px;
    text-align: center;
  }

  dd {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
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
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
