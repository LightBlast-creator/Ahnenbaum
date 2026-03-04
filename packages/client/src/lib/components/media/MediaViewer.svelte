<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';
  import MediaViewerSidebar from './MediaViewerSidebar.svelte';

  interface MediaLightboxItem {
    id: string;
    type: string;
    originalFilename: string;
    mimeType: string;
    caption?: string | null;
    description?: string | null;
    notes?: string | null;
    date?: string | null;
    size: number;
  }

  let {
    open = $bindable(false),
    items = [],
    currentIndex = $bindable(0),
    // Legacy single-item prop for backwards compat — if provided without items, wrap it
    media: legacyMedia,
    onDelete,
    onUnlink,
    onSetPrimary,
    onUpdated,
    onToast,
  }: {
    open: boolean;
    items?: MediaLightboxItem[];
    currentIndex?: number;
    media?: MediaLightboxItem | null;
    onDelete?: (id: string) => void;
    onUnlink?: (id: string) => void;
    onSetPrimary?: (id: string) => void;
    onUpdated?: (updatedMedia: Record<string, unknown>) => void;
    onToast?: (message: string, type: 'success' | 'error') => void;
  } = $props();

  // Resolve the active items list — prefer `items` prop, fall back to wrapping legacy `media`
  const resolvedItems = $derived(items.length > 0 ? items : legacyMedia ? [legacyMedia] : []);
  const media = $derived(resolvedItems[currentIndex] ?? null);
  const totalItems = $derived(resolvedItems.length);
  const hasPrev = $derived(currentIndex > 0);
  const hasNext = $derived(currentIndex < totalItems - 1);

  const API_BASE = '/api';
  const fileUrl = $derived(media ? `${API_BASE}/media/${media.id}/file` : '');

  // Preload adjacent images
  const prevFileUrl = $derived(
    hasPrev && resolvedItems[currentIndex - 1]?.type === 'image'
      ? `${API_BASE}/media/${resolvedItems[currentIndex - 1].id}/file`
      : null,
  );
  const nextFileUrl = $derived(
    hasNext && resolvedItems[currentIndex + 1]?.type === 'image'
      ? `${API_BASE}/media/${resolvedItems[currentIndex + 1].id}/file`
      : null,
  );

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
    if (captionValue === originalCaption && notesValue === originalNotes) return;
    isSaving = true;
    try {
      const updated = await api.patch<NonNullable<typeof media>>(`media/${media.id}`, {
        caption: captionValue || null,
        notes: notesValue || null,
      });
      originalCaption = captionValue;
      originalNotes = notesValue;
      onUpdated?.({ ...updated });
    } catch {
      onToast?.(m.toast_error(), 'error');
    } finally {
      isSaving = false;
    }
  }

  function close() {
    open = false;
  }

  function navigatePrev() {
    if (hasPrev) currentIndex--;
  }

  function navigateNext() {
    if (hasNext) currentIndex++;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigatePrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateNext();
    }
  }
</script>

{#if open && media}
  <!-- Preload adjacent images -->
  {#if prevFileUrl}
    <link rel="preload" as="image" href={prevFileUrl} />
  {/if}
  {#if nextFileUrl}
    <link rel="preload" as="image" href={nextFileUrl} />
  {/if}

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
        <!-- Item counter -->
        {#if totalItems > 1}
          <div class="viewer-counter">
            {m.media_viewer_counter({
              current: String(currentIndex + 1),
              total: String(totalItems),
            })}
          </div>
        {/if}

        <!-- Prev arrow -->
        {#if hasPrev}
          <button
            class="viewer-nav viewer-nav-prev"
            onclick={(e) => {
              e.stopPropagation();
              navigatePrev();
            }}
            aria-label={m.media_viewer_prev()}
          >
            ‹
          </button>
        {/if}

        <!-- Media content -->
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

        <!-- Next arrow -->
        {#if hasNext}
          <button
            class="viewer-nav viewer-nav-next"
            onclick={(e) => {
              e.stopPropagation();
              navigateNext();
            }}
            aria-label={m.media_viewer_next()}
          >
            ›
          </button>
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
    position: relative;
  }

  .viewer-counter {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    font-size: var(--font-size-sm);
    color: rgba(255, 255, 255, 0.8);
    background: rgba(0, 0, 0, 0.5);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    z-index: 2;
    pointer-events: none;
  }

  .viewer-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.4);
    color: white;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    z-index: 2;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      background var(--transition-fast);
  }

  .viewer-main:hover .viewer-nav {
    opacity: 1;
  }

  .viewer-nav:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .viewer-nav-prev {
    left: var(--space-3);
  }

  .viewer-nav-next {
    right: var(--space-3);
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

    .viewer-nav {
      opacity: 1;
      width: 36px;
      height: 36px;
      font-size: 1.2rem;
    }
  }
</style>
