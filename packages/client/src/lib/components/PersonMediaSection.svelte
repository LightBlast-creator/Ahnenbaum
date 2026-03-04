<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api, type PersonMediaLink, type PersonMediaItem } from '$lib/api';
  import { onDestroy } from 'svelte';
  import MediaGallery from '$lib/components/media/MediaGallery.svelte';
  import MediaViewer from '$lib/components/media/MediaViewer.svelte';
  import UploadProgress from '$lib/components/media/UploadProgress.svelte';
  import type { UploadItem } from '$lib/components/media/UploadProgress.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let {
    personId,
    onToast,
    onPrimaryChanged,
  }: {
    personId: string;
    onToast: (message: string, type: 'success' | 'error') => void;
    onPrimaryChanged?: () => void;
  } = $props();

  let personMediaItems = $state<{ link: PersonMediaLink; media: PersonMediaItem }[]>([]);
  let viewerOpen = $state(false);
  let viewerIndex = $state(0);
  let confirmOpen = $state(false);
  let unlinkConfirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let batchDeleteIds = $state<string[]>([]);
  let batchConfirmOpen = $state(false);

  // Upload progress state
  let uploadQueue = $state<UploadItem[]>([]);
  let abortHandles: (() => void)[] = [];
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    abortHandles.forEach((abort) => abort());
    abortHandles = [];
    if (dismissTimer) clearTimeout(dismissTimer);
  });

  const viewerItems = $derived(personMediaItems.map((i) => i.media));

  async function loadMedia() {
    if (!personId) return;
    try {
      personMediaItems = await api.get<{ link: PersonMediaLink; media: PersonMediaItem }[]>(
        `media-links/entity/person/${personId}`,
      );
    } catch {
      personMediaItems = [];
    }
  }

  $effect(() => {
    if (personId) loadMedia();
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
        const uploaded = await promise;
        await api.post('media-links', {
          mediaId: uploaded.id,
          entityType: 'person',
          entityId: personId,
        });
        uploadQueue[queueIndex] = { ...uploadQueue[queueIndex], status: 'success', progress: 100 };
        uploadQueue = [...uploadQueue];
        onToast(m.toast_media_uploaded(), 'success');
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

  async function handleSetPrimary(linkId: string) {
    try {
      await api.patch(`media-links/${linkId}`, { isPrimary: true });
      onToast(m.media_is_primary(), 'success');
      await loadMedia();
      onPrimaryChanged?.();
    } catch {
      onToast(m.toast_error(), 'error');
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
      onToast(m.toast_media_deleted(), 'success');
      viewerOpen = false;
      const wasPrimary = personMediaItems.some(
        (it) => it.media.id === pendingDeleteId && it.link.isPrimary,
      );
      await loadMedia();
      if (wasPrimary) onPrimaryChanged?.();
    } catch {
      onToast(m.toast_error(), 'error');
    } finally {
      pendingDeleteId = null;
    }
  }

  function openViewer(mediaId: string) {
    const idx = personMediaItems.findIndex((it) => it.media.id === mediaId);
    if (idx >= 0) {
      viewerIndex = idx;
      viewerOpen = true;
    }
  }

  function handleUnlinkClick(mediaId: string) {
    const item = personMediaItems.find((it) => it.media.id === mediaId);
    if (item) {
      // Store link id in pending state for the confirm dialog
      pendingDeleteId = item.link.id;
      unlinkConfirmOpen = true;
    }
  }

  async function executeUnlink() {
    if (!pendingDeleteId) return;
    try {
      await api.del(`media-links/${pendingDeleteId}`);
      onToast(m.toast_media_unlinked(), 'success');
      viewerOpen = false;
      pendingDeleteId = null;
      await loadMedia();
      onPrimaryChanged?.();
    } catch {
      onToast(m.toast_error(), 'error');
    }
  }

  function handleSetPrimaryFromViewer(mediaId: string) {
    const item = personMediaItems.find((it) => it.media.id === mediaId);
    if (item) handleSetPrimary(item.link.id);
  }

  function handleBatchDelete(ids: string[]) {
    batchDeleteIds = ids;
    batchConfirmOpen = true;
  }

  async function executeBatchDelete() {
    try {
      await Promise.all(batchDeleteIds.map((id) => api.del(`media/${id}`)));
      onToast(m.toast_media_deleted(), 'success');
      batchDeleteIds = [];
      const hadPrimary = personMediaItems.some(
        (it) => batchDeleteIds.includes(it.media.id) && it.link.isPrimary,
      );
      await loadMedia();
      if (hadPrimary) onPrimaryChanged?.();
    } catch {
      onToast(m.toast_error(), 'error');
    }
  }
</script>

<div class="person-media-section">
  <MediaGallery
    items={personMediaItems}
    onUpload={handleUpload}
    onItemClick={openViewer}
    onSetPrimary={handleSetPrimary}
    onBatchDelete={handleBatchDelete}
  />
</div>

<MediaViewer
  bind:open={viewerOpen}
  items={viewerItems}
  bind:currentIndex={viewerIndex}
  onDelete={handleDeleteClick}
  onUnlink={handleUnlinkClick}
  onSetPrimary={handleSetPrimaryFromViewer}
  {onToast}
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
  bind:open={unlinkConfirmOpen}
  title={m.media_unlink()}
  message={m.media_delete_confirm()}
  confirmLabel={m.media_unlink()}
  variant="danger"
  onConfirm={executeUnlink}
/>

<ConfirmDialog
  bind:open={batchConfirmOpen}
  title={m.media_delete()}
  message={m.media_delete_selected_confirm({ count: String(batchDeleteIds.length) })}
  confirmLabel={m.media_delete_selected({ count: String(batchDeleteIds.length) })}
  variant="danger"
  onConfirm={executeBatchDelete}
/>

<UploadProgress items={uploadQueue} />

<style>
  .person-media-section {
    margin-top: var(--space-6);
  }
</style>
