<script lang="ts">
  import { onlineUsers, wsStatus } from '$lib/ws';

  let showTooltip = $state(false);

  const count = $derived($onlineUsers.length);
  const isConnected = $derived($wsStatus === 'connected');

  // Deduplicate by userId for display — same user across tabs shows once
  const uniqueUsers = $derived([...new Map($onlineUsers.map((u) => [u.userId, u])).values()]);
</script>

{#if isConnected}
  <div
    class="presence-pill"
    role="status"
    aria-label="{count} connection{count !== 1 ? 's' : ''} online"
    onmouseenter={() => (showTooltip = true)}
    onmouseleave={() => (showTooltip = false)}
  >
    <span class="presence-dot"></span>
    <span class="presence-count">{count}</span>

    {#if showTooltip && uniqueUsers.length > 0}
      <div class="presence-tooltip">
        <div class="tooltip-title">Online now</div>
        {#each uniqueUsers as user (user.userId)}
          <div class="tooltip-user">
            <span class="tooltip-dot"></span>
            <span>{user.userId}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .presence-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 4px);
    padding: 4px 10px;
    background: var(--color-bg-secondary, #f3f4f6);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 9999px;
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--color-text-secondary, #6b7280);
    cursor: default;
    user-select: none;
  }

  .presence-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-success);
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      box-shadow: 0 0 4px rgba(34, 197, 94, 0.3);
    }
    50% {
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
    }
  }

  .presence-count {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .presence-tooltip {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 160px;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.12));
    z-index: var(--z-tooltip, 100);
    font-size: var(--font-size-xs, 0.75rem);
  }

  .tooltip-title {
    font-weight: 600;
    color: var(--color-text, #111);
    margin-bottom: var(--space-1, 4px);
    padding-bottom: var(--space-1, 4px);
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .tooltip-user {
    display: flex;
    align-items: center;
    gap: var(--space-1, 4px);
    padding: 2px 0;
    color: var(--color-text-secondary, #6b7280);
  }

  .tooltip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-success);
    flex-shrink: 0;
  }
</style>
