<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  interface Props {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  }

  let { page, totalPages, total, pageSize, onPageChange }: Props = $props();
</script>

{#if totalPages > 1}
  <div class="pagination">
    <button
      class="page-btn"
      disabled={page <= 1}
      onclick={() => onPageChange(Math.max(1, page - 1))}
    >
      {m.pagination_previous()}
    </button>

    <span class="page-info">
      {m.pagination_showing({
        from: String((page - 1) * pageSize + 1),
        to: String(Math.min(page * pageSize, total)),
        total: String(total),
      })}
    </span>

    <button
      class="page-btn"
      disabled={page >= totalPages}
      onclick={() => onPageChange(Math.min(totalPages, page + 1))}
    >
      {m.pagination_next()}
    </button>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }

  .page-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
</style>
