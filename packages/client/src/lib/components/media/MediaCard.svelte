<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { API_BASE } from '$lib/api';

  let {
    media,
    type,
    isPrimary = false,
    caption,
    size,
    createdAt,
    selectable = false,
    selected = false,
    onClick,
    onSetPrimary,
    onToggleSelect,
  }: {
    media: { id: string; type: string; originalFilename: string; caption?: string | null };
    type: string;
    isPrimary?: boolean;
    caption?: string | null;
    size?: number;
    createdAt?: string;
    selectable?: boolean;
    selected?: boolean;
    onClick?: () => void;
    onSetPrimary?: () => void;
    onToggleSelect?: () => void;
  } = $props();

  const typeIcons: Record<string, string> = {
    image: '🖼️',
    pdf: '📄',
    video: '🎬',
    audio: '🎵',
  };

  const thumbUrl = $derived(type === 'image' ? `${API_BASE}/media/${media.id}/thumb` : null);
  const canSetPrimary = $derived(type === 'image' && !isPrimary && !!onSetPrimary);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  function handleClick() {
    if (selectable) {
      onToggleSelect?.();
    } else {
      onClick?.();
    }
  }
</script>

<div
  class="media-card"
  class:primary={isPrimary}
  class:selected
  class:selectable
  role="button"
  tabindex="0"
  onclick={handleClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') handleClick();
  }}
  aria-label={caption ?? media.originalFilename}
>
  <div class="card-preview">
    {#if thumbUrl}
      <img src={thumbUrl} alt={caption ?? media.originalFilename} loading="lazy" />
    {:else}
      <span class="type-icon">{typeIcons[type] ?? '📎'}</span>
    {/if}
    {#if isPrimary}
      <span class="primary-badge" title={m.media_is_primary()}>⭐</span>
    {/if}
    {#if canSetPrimary && !selectable}
      <button
        class="set-primary-btn"
        title={m.media_set_primary()}
        onclick={(e) => {
          e.stopPropagation();
          onSetPrimary?.();
        }}
      >
        ⭐ {m.media_set_primary()}
      </button>
    {/if}

    {#if selectable}
      <span class="select-checkbox" class:checked={selected}>
        {#if selected}✓{/if}
      </span>
    {/if}

    <!-- Hover overlay with metadata -->
    {#if !selectable && (size || createdAt)}
      <div class="card-overlay">
        <span class="overlay-name">{media.originalFilename}</span>
        <div class="overlay-meta">
          {#if createdAt}
            <span>{formatDate(createdAt)}</span>
          {/if}
          {#if size}
            <span>{formatSize(size)}</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  <div class="card-meta">
    <span class="card-name">{caption ?? media.originalFilename}</span>
  </div>
</div>

<style>
  .media-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    transition: all var(--transition-fast);
    cursor: pointer;
    text-align: left;
    break-inside: avoid;
    margin-bottom: var(--space-3);
  }

  .media-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: scale(1.02);
  }

  .media-card.primary {
    border-color: var(--color-warning, #f59e0b);
  }

  .media-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary);
  }

  .card-preview {
    position: relative;
    overflow: hidden;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .card-preview img {
    width: 100%;
    height: auto;
    display: block;
  }

  .type-icon {
    font-size: 2rem;
    padding: var(--space-8) 0;
  }

  .primary-badge {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    font-size: var(--font-size-sm);
    background: rgba(0, 0, 0, 0.6);
    border-radius: var(--radius-full);
    padding: 2px 4px;
  }

  .set-primary-btn {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-2);
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    border: none;
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--transition-fast);
    text-align: center;
  }

  .card-preview:hover .set-primary-btn {
    opacity: 1;
  }

  .set-primary-btn:hover {
    background: rgba(0, 0, 0, 0.9);
  }

  /* Selection checkbox */
  .select-checkbox {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    width: 22px;
    height: 22px;
    border-radius: var(--radius-full);
    border: 2px solid rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
    transition: all var(--transition-fast);
    z-index: 2;
  }

  .select-checkbox.checked {
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  /* Hover overlay */
  .card-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    transform: translateY(100%);
    transition: transform var(--transition-fast);
    z-index: 1;
  }

  .card-preview:hover .card-overlay {
    transform: translateY(0);
  }

  .overlay-name {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .overlay-meta {
    display: flex;
    gap: var(--space-2);
    font-size: 10px;
    opacity: 0.8;
    margin-top: 2px;
  }

  .card-meta {
    padding: var(--space-2);
  }

  .card-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
