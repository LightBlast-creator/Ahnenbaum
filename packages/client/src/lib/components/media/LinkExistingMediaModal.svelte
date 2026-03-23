<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api, API_BASE, type PersonMediaItem } from '$lib/api';

  let {
    open = $bindable(false),
    personId,
    alreadyLinkedIds,
    onLinked,
  }: {
    open: boolean;
    personId: string;
    alreadyLinkedIds: Set<string>;
    onLinked: (message: string, type: 'success' | 'error') => void;
  } = $props();

  let allMedia = $state<PersonMediaItem[]>([]);
  let loading = $state(false);
  let linking = $state(false);
  let searchQuery = $state('');
  let filterType = $state('');

  const typeFilters = [
    { value: '', label: () => m.search_filter_all() },
    { value: 'image', label: () => m.media_type_image() },
    { value: 'pdf', label: () => m.media_type_pdf() },
    { value: 'video', label: () => m.media_type_video() },
    { value: 'audio', label: () => m.media_type_audio() },
  ];

  const typeIcons: Record<string, string> = {
    image: '🖼️',
    pdf: '📄',
    video: '🎬',
    audio: '🎵',
  };

  // Filter out already-linked media, then apply search
  const availableMedia = $derived.by(() => {
    let items = allMedia.filter((m) => !alreadyLinkedIds.has(m.id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (m) =>
          m.originalFilename.toLowerCase().includes(q) ||
          (m.caption && m.caption.toLowerCase().includes(q)),
      );
    }
    return items;
  });

  // Single effect: loads media when modal opens or filter type changes
  $effect(() => {
    void filterType;
    if (open) loadMedia();
  });

  async function loadMedia() {
    loading = true;
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filterType) params.type = filterType;

      const data = await api.get<{ media: PersonMediaItem[]; total: number }>('media', params);
      allMedia = data.media;
    } catch {
      allMedia = [];
    }
    loading = false;
  }

  function close() {
    open = false;
    searchQuery = '';
    filterType = '';
  }

  async function linkMedia(mediaId: string) {
    if (linking) return;
    linking = true;
    try {
      await api.post('media-links', {
        mediaId,
        entityType: 'person',
        entityId: personId,
      });
      onLinked(m.toast_media_linked(), 'success');
      close();
    } catch {
      onLinked(m.toast_error(), 'error');
    } finally {
      linking = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="modal link-media-modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-label={m.media_link_existing()}
      tabindex="-1"
    >
      <div class="modal-header">
        <h2>{m.media_link_existing()}</h2>
        <button class="modal-close" onclick={close} aria-label={m.shortcuts_close()}>×</button>
      </div>

      <div class="modal-body">
        <!-- Search input -->
        <input
          type="search"
          class="search-input"
          placeholder={m.media_link_existing_search()}
          bind:value={searchQuery}
        />

        <!-- Type filter pills -->
        <div class="filter-pills">
          {#each typeFilters as filter (filter.value)}
            <button
              class="filter-pill"
              class:active={filterType === filter.value}
              onclick={() => (filterType = filter.value)}
            >
              {filter.label()}
            </button>
          {/each}
        </div>

        <!-- Media grid -->
        {#if loading}
          <p class="status-text">{m.loading()}</p>
        {:else if availableMedia.length === 0}
          <p class="status-text">{m.media_link_existing_empty()}</p>
        {:else}
          <div class="picker-grid">
            {#each availableMedia as item (item.id)}
              <button
                class="picker-item"
                onclick={() => linkMedia(item.id)}
                disabled={linking}
                title={item.caption ?? item.originalFilename}
              >
                <div class="picker-preview">
                  {#if item.type === 'image'}
                    <img
                      src="{API_BASE}/media/{item.id}/thumb"
                      alt={item.caption ?? item.originalFilename}
                      loading="lazy"
                    />
                  {:else}
                    <span class="type-icon">{typeIcons[item.type] ?? '📎'}</span>
                  {/if}
                </div>
                <span class="picker-name">{item.caption ?? item.originalFilename}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .link-media-modal {
    max-width: 680px;
  }

  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-secondary);
    color: var(--color-text);
    font-size: var(--font-size-sm);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  .filter-pills {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .filter-pill {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .filter-pill:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .filter-pill.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .status-text {
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-8) 0;
  }

  .picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--space-3);
    max-height: 400px;
    overflow-y: auto;
  }

  .picker-item {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    padding: 0;
  }

  .picker-item:hover:not(:disabled) {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
    transform: scale(1.03);
  }

  .picker-item:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  .picker-preview {
    background: var(--color-bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    overflow: hidden;
  }

  .picker-preview img {
    width: 100%;
    height: auto;
    display: block;
  }

  .type-icon {
    font-size: 2rem;
    padding: var(--space-6) 0;
  }

  .picker-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    padding: var(--space-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  @media (max-width: 480px) {
    .picker-grid {
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    }
  }
</style>
