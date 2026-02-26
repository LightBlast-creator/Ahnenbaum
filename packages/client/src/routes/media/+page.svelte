<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import MediaGallery from '$lib/components/media/MediaGallery.svelte';
  import MediaViewer from '$lib/components/media/MediaViewer.svelte';
  import Toast from '$lib/components/Toast.svelte';

  const API_BASE = '/api';

  interface MediaItem {
    id: string;
    type: string;
    originalFilename: string;
    mimeType: string;
    caption: string | null;
    description: string | null;
    date: string | null;
    size: number;
  }

  let mediaItems = $state<
    {
      link: { id: string; isPrimary: boolean; caption: string | null; sortOrder: number | null };
      media: MediaItem;
    }[]
  >([]);
  let loading = $state(true);
  let selectedMedia = $state<MediaItem | null>(null);
  let viewerOpen = $state(false);
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');
  let filterType = $state('');

  async function loadMedia() {
    loading = true;
    try {
      const url = filterType
        ? `${API_BASE}/media?limit=100&type=${filterType}`
        : `${API_BASE}/media?limit=100`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.ok) {
        mediaItems = json.data.media.map((m: MediaItem) => ({
          link: { id: m.id, isPrimary: false, caption: m.caption, sortOrder: null },
          media: m,
        }));
      }
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
    loading = false;
  }

  $effect(() => {
    void filterType;
    loadMedia();
  });

  async function handleUpload(files: File[]) {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/media`, {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.ok) {
          toastMessage = m.toast_media_uploaded();
          toastType = 'success';
        } else {
          toastMessage = json.error?.message ?? m.media_upload_error();
          toastType = 'error';
        }
      } catch {
        toastMessage = m.media_upload_error();
        toastType = 'error';
      }
    }
    loadMedia();
  }

  function openViewer(mediaId: string) {
    const item = mediaItems.find((m) => m.media.id === mediaId);
    if (item) {
      selectedMedia = item.media;
      viewerOpen = true;
    }
  }

  async function handleDelete(mediaId: string) {
    if (!confirm(m.media_delete_confirm())) return;
    try {
      await fetch(`${API_BASE}/media/${mediaId}`, { method: 'DELETE' });
      toastMessage = m.toast_media_deleted();
      toastType = 'success';
      viewerOpen = false;
      loadMedia();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  const typeFilters = [
    { value: '', label: () => m.search_filter_all() },
    { value: 'image', label: () => m.media_type_image() },
    { value: 'pdf', label: () => m.media_type_pdf() },
    { value: 'video', label: () => m.media_type_video() },
    { value: 'audio', label: () => m.media_type_audio() },
  ];
</script>

<svelte:head>
  <title>{m.media_title()} | {m.app_title()}</title>
</svelte:head>

<div class="media-page">
  <header class="page-header">
    <h1>{m.media_title()}</h1>
    <div class="filter-bar">
      {#each typeFilters as filter (filter.value)}
        <button
          class="filter-btn"
          class:active={filterType === filter.value}
          onclick={() => (filterType = filter.value)}
        >
          {filter.label()}
        </button>
      {/each}
    </div>
  </header>

  {#if loading}
    <div class="loading">Loading…</div>
  {:else}
    <MediaGallery items={mediaItems} onUpload={handleUpload} onItemClick={openViewer} />
  {/if}
</div>

<MediaViewer bind:open={viewerOpen} media={selectedMedia} onDelete={handleDelete} />

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<style>
  .media-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-6);
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .page-header h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
  }

  .filter-bar {
    display: flex;
    gap: var(--space-1);
    background: var(--color-bg-secondary);
    padding: var(--space-1);
    border-radius: var(--radius-md);
  }

  .filter-btn {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .filter-btn.active {
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-sm);
  }

  .filter-btn:hover:not(.active) {
    color: var(--color-text);
  }

  .loading {
    text-align: center;
    padding: var(--space-16);
    color: var(--color-text-muted);
  }

  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
