<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { connectionStatus, type ConnectionState } from '$lib/connection';

  let status = $state<ConnectionState>('online');
  let showRestored = $state(false);
  let prevStatus: ConnectionState = 'online';

  $effect(() => {
    const unsub = connectionStatus.subscribe((s) => {
      // Flash "restored" briefly when going from disconnected → online
      if (prevStatus !== 'online' && s === 'online') {
        showRestored = true;
        setTimeout(() => {
          showRestored = false;
        }, 3000);
      }
      prevStatus = status;
      status = s;
    });
    return unsub;
  });

  const isVisible = $derived(status !== 'online' || showRestored);
  const isOffline = $derived(status === 'offline');
</script>

{#if isVisible}
  <div
    class="connection-banner"
    class:offline={isOffline}
    class:restored={showRestored}
    role="status"
    aria-live="polite"
  >
    <span class="banner-icon">
      {#if showRestored}
        ✅
      {:else if isOffline}
        🔴
      {:else}
        <span class="pulse-dot"></span>
      {/if}
    </span>
    <span class="banner-text">
      {#if showRestored}
        {m.connection_restored()}
      {:else if isOffline}
        {m.connection_offline()}
      {:else}
        {m.connection_reconnecting()}
      {/if}
    </span>
  </div>
{/if}

<style>
  .connection-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-warning);
    color: #0f172a;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    z-index: calc(var(--z-toast) + 10);
    animation: slide-down 200ms ease;
  }

  .connection-banner.offline {
    background: var(--color-error);
    color: #ffffff;
  }

  .connection-banner.restored {
    background: var(--color-success);
    color: #ffffff;
    animation: slide-down 200ms ease;
  }

  .banner-icon {
    display: flex;
    align-items: center;
    font-size: var(--font-size-xs);
  }

  .banner-text {
    line-height: 1;
  }

  .pulse-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background: #0f172a;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes slide-down {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
</style>
