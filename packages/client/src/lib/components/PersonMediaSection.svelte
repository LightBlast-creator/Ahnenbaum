<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api, type PersonMediaLink, type PersonMediaItem } from '$lib/api';
  import MediaGallery from '$lib/components/media/MediaGallery.svelte';
  import MediaViewer from '$lib/components/media/MediaViewer.svelte';
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
  let selectedMedia = $state<PersonMediaItem | null>(null);
  let selectedLinkId = $state<string | null>(null);
  let viewerOpen = $state(false);
  let confirmOpen = $state(false);
  let unlinkConfirmOpen = $state(false);
  let pendingDeleteId = $state<string | null>(null);

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

  async function handleUpload(files: File[]) {
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const uploaded = await api.postFormData<{ id: string }>('media', formData);
        await api.post('media-links', {
          mediaId: uploaded.id,
          entityType: 'person',
          entityId: personId,
        });
        onToast(m.toast_media_uploaded(), 'success');
      } catch {
        onToast(m.toast_error(), 'error');
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
      selectedMedia = null;
      // Check if deleted media was the primary photo
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
    const item = personMediaItems.find((it) => it.media.id === mediaId);
    if (item) {
      selectedMedia = item.media;
      selectedLinkId = item.link.id;
      viewerOpen = true;
    }
  }

  function handleUnlinkClick(mediaId: string) {
    const item = personMediaItems.find((it) => it.media.id === mediaId);
    if (item) {
      selectedLinkId = item.link.id;
      unlinkConfirmOpen = true;
    }
  }

  async function executeUnlink() {
    if (!selectedLinkId) return;
    try {
      await api.del(`media-links/${selectedLinkId}`);
      onToast(m.toast_media_unlinked(), 'success');
      viewerOpen = false;
      selectedMedia = null;
      selectedLinkId = null;
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
</script>

<div class="person-media-section">
  <MediaGallery
    items={personMediaItems}
    onUpload={handleUpload}
    onItemClick={openViewer}
    onSetPrimary={handleSetPrimary}
  />
</div>

<MediaViewer
  bind:open={viewerOpen}
  media={selectedMedia}
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

<style>
  .person-media-section {
    margin-top: var(--space-6);
  }
</style>
