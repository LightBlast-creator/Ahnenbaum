<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api, type PersonMediaLink, type PersonMediaItem } from '$lib/api';
  import MediaGallery from '$lib/components/media/MediaGallery.svelte';
  import MediaViewer from '$lib/components/media/MediaViewer.svelte';

  let {
    personId,
    onToast,
  }: {
    personId: string;
    onToast: (message: string, type: 'success' | 'error') => void;
  } = $props();

  let personMediaItems = $state<{ link: PersonMediaLink; media: PersonMediaItem }[]>([]);
  let selectedMedia = $state<PersonMediaItem | null>(null);
  let viewerOpen = $state(false);

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

  function openViewer(mediaId: string) {
    const item = personMediaItems.find((it) => it.media.id === mediaId);
    if (item) {
      selectedMedia = item.media;
      viewerOpen = true;
    }
  }
</script>

<div class="person-media-section">
  <MediaGallery items={personMediaItems} onUpload={handleUpload} onItemClick={openViewer} />
</div>

<MediaViewer bind:open={viewerOpen} media={selectedMedia} />

<style>
  .person-media-section {
    margin-top: var(--space-6);
  }
</style>
