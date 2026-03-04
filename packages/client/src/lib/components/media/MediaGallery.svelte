<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { SvelteSet } from 'svelte/reactivity';
  import MediaCard from './MediaCard.svelte';
  import MediaUpload from './MediaUpload.svelte';

  let {
    items = [],
    onUpload,
    onItemClick,
    onSetPrimary,
    onBatchDelete,
  }: {
    items: {
      link: {
        id: string;
        isPrimary?: boolean | null;
        caption?: string | null;
        sortOrder?: number | null;
      };
      media: {
        id: string;
        type: string;
        originalFilename: string;
        caption?: string | null;
        size?: number;
        createdAt?: string;
      };
    }[];
    onUpload?: (files: File[]) => void;
    onItemClick?: (mediaId: string) => void;
    onSetPrimary?: (linkId: string) => void;
    onBatchDelete?: (ids: string[]) => void;
  } = $props();

  let selectionMode = $state(false);
  let selectedIds = new SvelteSet<string>();

  function toggleSelect(mediaId: string) {
    if (selectedIds.has(mediaId)) {
      selectedIds.delete(mediaId);
    } else {
      selectedIds.add(mediaId);
    }
  }

  function selectAll() {
    selectedIds.clear();
    items.forEach((i) => selectedIds.add(i.media.id));
  }

  function deselectAll() {
    selectedIds.clear();
  }

  function exitSelectionMode() {
    selectionMode = false;
    selectedIds.clear();
  }

  function handleDeleteSelected() {
    if (selectedIds.size > 0 && onBatchDelete) {
      onBatchDelete([...selectedIds]);
      exitSelectionMode();
    }
  }
</script>

<section class="media-gallery" aria-label={m.media_gallery()}>
  <div class="gallery-header">
    <h3>{m.media_gallery()}</h3>
    <span class="gallery-count">{items.length}</span>
    <div class="gallery-actions">
      {#if !selectionMode && items.length > 0 && onBatchDelete}
        <button class="btn-select" onclick={() => (selectionMode = true)}>
          {m.media_select_mode()}
        </button>
      {/if}
    </div>
  </div>

  {#if selectionMode}
    <div class="selection-toolbar">
      <div class="selection-info">
        {selectedIds.size} / {items.length}
      </div>
      <div class="selection-actions">
        {#if selectedIds.size < items.length}
          <button class="btn-toolbar" onclick={selectAll}>{m.media_select_all()}</button>
        {:else}
          <button class="btn-toolbar" onclick={deselectAll}>{m.media_deselect_all()}</button>
        {/if}
        {#if selectedIds.size > 0}
          <button class="btn-toolbar btn-danger" onclick={handleDeleteSelected}>
            {m.media_delete_selected({ count: String(selectedIds.size) })}
          </button>
        {/if}
        <button class="btn-toolbar" onclick={exitSelectionMode}>
          {m.media_select_cancel()}
        </button>
      </div>
    </div>
  {/if}

  {#if items.length > 0}
    <div class="gallery-grid">
      {#each items as item (item.link.id)}
        <MediaCard
          media={item.media}
          type={item.media.type}
          isPrimary={item.link.isPrimary ?? false}
          caption={item.link.caption ?? item.media.caption}
          size={item.media.size}
          createdAt={item.media.createdAt}
          selectable={selectionMode}
          selected={selectedIds.has(item.media.id)}
          onClick={() => onItemClick?.(item.media.id)}
          onSetPrimary={onSetPrimary ? () => onSetPrimary(item.link.id) : undefined}
          onToggleSelect={() => toggleSelect(item.media.id)}
        />
      {/each}
    </div>
  {:else}
    <p class="gallery-empty">{m.media_gallery_empty()}</p>
  {/if}

  {#if onUpload}
    <div class="gallery-upload">
      <MediaUpload {onUpload} />
    </div>
  {/if}
</section>

<style>
  .media-gallery {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .gallery-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .gallery-header h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .gallery-count {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    padding: 0 var(--space-2);
    border-radius: var(--radius-full);
  }

  .gallery-actions {
    margin-left: auto;
  }

  .btn-select {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-select:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .selection-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }

  .selection-info {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .selection-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .btn-toolbar {
    font-size: var(--font-size-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-toolbar:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-toolbar.btn-danger {
    color: var(--color-danger, #ef4444);
    border-color: var(--color-danger, #ef4444);
  }

  .btn-toolbar.btn-danger:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .gallery-grid {
    columns: 4 200px;
    column-gap: var(--space-3);
  }

  .gallery-empty {
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-8) 0;
  }

  .gallery-upload {
    margin-top: var(--space-2);
  }

  @media (max-width: 1024px) {
    .gallery-grid {
      columns: 3;
    }
  }

  @media (max-width: 768px) {
    .gallery-grid {
      columns: 2;
    }
  }
</style>
