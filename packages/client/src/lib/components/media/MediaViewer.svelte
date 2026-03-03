<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';
  import MediaViewerSidebar from './MediaViewerSidebar.svelte';

  let {
    open = $bindable(false),
    media,
    onDelete,
    onUnlink,
    onSetPrimary,
    onUpdated,
    onToast,
  }: {
    open: boolean;
    media?: {
      id: string;
      type: string;
      originalFilename: string;
      mimeType: string;
      caption?: string | null;
      description?: string | null;
      notes?: string | null;
      date?: string | null;
      size: number;
    } | null;
    onDelete?: (id: string) => void;
    onUnlink?: (id: string) => void;
    onSetPrimary?: (id: string) => void;
    onUpdated?: (updatedMedia: Record<string, unknown>) => void;
    onToast?: (message: string, type: 'success' | 'error') => void;
  } = $props();

  const API_BASE = '/api';

  const fileUrl = $derived(media ? `${API_BASE}/media/${media.id}/file` : '');

  let captionValue = $state('');
  let notesValue = $state('');
  let isSaving = $state(false);
  let originalCaption = $state('');
  let originalNotes = $state('');

  $effect(() => {
    if (media) {
      const cap = media.caption ?? '';
      const notes = media.notes ?? '';
      captionValue = cap;
      notesValue = notes;
      originalCaption = cap;
      originalNotes = notes;
    }
  });

  async function saveMetadata() {
    if (!media || isSaving) return;
    // Skip if nothing changed
    if (captionValue === originalCaption && notesValue === originalNotes) return;
    isSaving = true;
    try {
      const updated = await api.patch<NonNullable<typeof media>>(`media/${media.id}`, {
        caption: captionValue || null,
        notes: notesValue || null,
      });
      originalCaption = captionValue;
      originalNotes = notesValue;
      onUpdated?.(updated);
    } catch {
      onToast?.(m.toast_error(), 'error');
    } finally {
      isSaving = false;
    }
  }

  function close() {
    open = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      // Blur active element first so we don't trigger a save-then-close race
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      close();
    }
  }
</script>

{#if open && media}
  <div class="viewer-backdrop" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="viewer"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label={media.caption ?? media.originalFilename}
      tabindex="-1"
      onkeydown={handleKeydown}
    >
      <div class="viewer-main">
        {#if media.type === 'image'}
          <img src={fileUrl} alt={media.caption ?? media.originalFilename} class="viewer-image" />
        {:else if media.type === 'pdf'}
          <iframe src={fileUrl} title={media.originalFilename} class="viewer-pdf"></iframe>
        {:else if media.type === 'video'}
          <video src={fileUrl} controls class="viewer-video">
            <track kind="captions" />
          </video>
        {:else if media.type === 'audio'}
          <div class="viewer-audio">
            <span class="audio-icon">🎵</span>
            <audio src={fileUrl} controls></audio>
          </div>
        {/if}
      </div>

      <MediaViewerSidebar
        {media}
        bind:captionValue
        bind:notesValue
        onSaveMetadata={saveMetadata}
        onClose={close}
        {onDelete}
        {onUnlink}
        {onSetPrimary}
      />
    </div>
  </div>
{/if}

<style>
  .viewer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: var(--z-modal);
    animation: fade-in 150ms ease;
  }

  .viewer {
    display: flex;
    width: 95vw;
    height: 90vh;
    max-width: 1200px;
    background: var(--color-surface);
    border-radius: var(--radius-xl);
    overflow: hidden;
    animation: scale-up 200ms ease;
  }

  .viewer-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
    overflow: hidden;
  }

  .viewer-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .viewer-pdf {
    width: 100%;
    height: 100%;
    border: none;
  }

  .viewer-video {
    max-width: 100%;
    max-height: 100%;
  }

  .viewer-audio {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-8);
  }

  .audio-icon {
    font-size: 4rem;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-up {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 768px) {
    .viewer {
      flex-direction: column;
    }
  }
</style>
