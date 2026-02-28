<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    media,
    type,
    isPrimary = false,
    caption,
    onClick,
    onSetPrimary,
  }: {
    media: { id: string; type: string; originalFilename: string; caption?: string | null };
    type: string;
    isPrimary?: boolean;
    caption?: string | null;
    onClick?: () => void;
    onSetPrimary?: () => void;
  } = $props();

  const API_BASE = '/api';

  const typeIcons: Record<string, string> = {
    image: '🖼️',
    pdf: '📄',
    video: '🎬',
    audio: '🎵',
  };

  const thumbUrl = $derived(type === 'image' ? `${API_BASE}/media/${media.id}/thumb` : null);
  const canSetPrimary = $derived(type === 'image' && !isPrimary && !!onSetPrimary);
</script>

<div
  class="media-card"
  class:primary={isPrimary}
  role="button"
  tabindex="0"
  onclick={onClick}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') onClick?.();
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
    {#if canSetPrimary}
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
  }

  .media-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .media-card.primary {
    border-color: var(--color-warning, #f59e0b);
  }

  .card-preview {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .type-icon {
    font-size: 2rem;
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
