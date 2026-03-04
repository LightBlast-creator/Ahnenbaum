<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';
  import { onDestroy } from 'svelte';
  import MediaGallery from '$lib/components/media/MediaGallery.svelte';
  import MediaViewer from '$lib/components/media/MediaViewer.svelte';
  import UploadProgress from '$lib/components/media/UploadProgress.svelte';
  import type { UploadItem } from '$lib/components/media/UploadProgress.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import SkeletonLoader from '$lib/components/SkeletonLoader.svelte';

  interface MediaItem {
    id: string;
    type: string;
    originalFilename: string;
    mimeType: string;
    caption: string | null;
    description: string | null;
    notes: string | null;
    date: string | null;
    size: number;
    createdAt: string;
  }

  let mediaItems = $state<
    {
      link: { id: string; isPrimary: boolean; caption: string | null; sortOrder: number | null };
      media: MediaItem;
    }[]
  >([]);
  let loading = $state(true);
  let viewerOpen = $state(false);
  let viewerIndex = $state(0);
  let toastMessage = $state('');
  let toastType: 'success' | 'error' = $state('success');
  let confirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let batchDeleteIds = $state<string[]>([]);
  let batchConfirmOpen = $state(false);
  let filterType = $state('');

  // Upload progress state
  let uploadQueue = $state<UploadItem[]>([]);
  let abortHandles: (() => void)[] = [];
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    abortHandles.forEach((abort) => abort());
    abortHandles = [];
    if (dismissTimer) clearTimeout(dismissTimer);
  });

  const viewerItems = $derived(mediaItems.map((i) => i.media));

  async function loadMedia() {
    loading = true;
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filterType) params.type = filterType;

      const data = await api.get<{ media: MediaItem[]; total: number }>('media', params);
      mediaItems = data.media.map((item: MediaItem) => ({
        link: { id: item.id, isPrimary: false, caption: item.caption, sortOrder: null },
        media: item,
      }));
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

  // Auto-dismiss upload queue 3s after all complete
  $effect(() => {
    if (dismissTimer) clearTimeout(dismissTimer);
    const allDone =
      uploadQueue.length > 0 &&
      uploadQueue.every((i) => i.status === 'success' || i.status === 'error');
    if (allDone) {
      dismissTimer = setTimeout(() => {
        uploadQueue = [];
      }, 3000);
    }
  });

  async function handleUpload(files: File[]) {
    const newItems: UploadItem[] = files.map((file) => ({
      file,
      progress: 0,
      status: 'queued' as const,
    }));
    uploadQueue = [
      ...uploadQueue.filter((i) => i.status !== 'success' && i.status !== 'error'),
      ...newItems,
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const queueIndex = uploadQueue.findIndex(
        (item) => item.file === file && item.status === 'queued',
      );
      if (queueIndex === -1) continue;

      uploadQueue[queueIndex] = { ...uploadQueue[queueIndex], status: 'uploading' };
      uploadQueue = [...uploadQueue];

      const formData = new FormData();
      formData.append('file', file);

      const { promise, abort } = api.uploadFormData<{ id: string }>('media', formData, (event) => {
        const progress = Math.round((event.loaded / event.total) * 100);
        uploadQueue[queueIndex] = { ...uploadQueue[queueIndex], progress };
        uploadQueue = [...uploadQueue];
      });

      abortHandles.push(abort);

      try {
        await promise;
        uploadQueue[queueIndex] = { ...uploadQueue[queueIndex], status: 'success', progress: 100 };
        uploadQueue = [...uploadQueue];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : m.media_upload_error();
        uploadQueue[queueIndex] = {
          ...uploadQueue[queueIndex],
          status: 'error',
          error: errorMsg,
        };
        uploadQueue = [...uploadQueue];
      }
    }
    loadMedia();
  }

  function openViewer(mediaId: string) {
    const idx = mediaItems.findIndex((m) => m.media.id === mediaId);
    if (idx >= 0) {
      viewerIndex = idx;
      viewerOpen = true;
    }
  }

  function handleDeleteClick(mediaId: string) {
    pendingDeleteId = mediaId;
    confirmOpen = true;
  }

  async function executeDelete() {
    if (!pendingDeleteId) return;
    try {
      await api.del(`media/${pendingDeleteId}`);
      toastMessage = m.toast_media_deleted();
      toastType = 'success';
      viewerOpen = false;
      pendingDeleteId = null;
      loadMedia();
    } catch {
      toastMessage = m.toast_error();
      toastType = 'error';
    }
  }

  function handleBatchDelete(ids: string[]) {
    batchDeleteIds = ids;
    batchConfirmOpen = true;
  }

  async function executeBatchDelete() {
    try {
      await Promise.all(batchDeleteIds.map((id) => api.del(`media/${id}`)));
      toastMessage = m.toast_media_deleted();
      toastType = 'success';
      batchDeleteIds = [];
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

<div class="entity-page media-page">
  <header class="page-header">
    <h1>{m.media_title()}</h1>
  </header>

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

  {#if loading}
    <SkeletonLoader variant="card" count={6} />
  {:else}
    <MediaGallery
      items={mediaItems}
      onUpload={handleUpload}
      onItemClick={openViewer}
      onBatchDelete={handleBatchDelete}
    />
  {/if}
</div>

<MediaViewer
  bind:open={viewerOpen}
  items={viewerItems}
  bind:currentIndex={viewerIndex}
  onDelete={handleDeleteClick}
  onToast={(msg, type) => {
    toastMessage = msg;
    toastType = type;
  }}
/>

<ConfirmDialog
  bind:open={confirmOpen}
  title={m.media_delete()}
  message={m.media_delete_confirm()}
  confirmLabel={m.media_delete()}
  variant="danger"
  onConfirm={executeDelete}
/>

<ConfirmDialog
  bind:open={batchConfirmOpen}
  title={m.media_delete()}
  message={m.media_delete_selected_confirm({ count: String(batchDeleteIds.length) })}
  confirmLabel={m.media_delete_selected({ count: String(batchDeleteIds.length) })}
  variant="danger"
  onConfirm={executeBatchDelete}
/>

<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = '')} />

<UploadProgress items={uploadQueue} />

<style>
  .media-page {
    max-width: 1200px;
  }
</style>
