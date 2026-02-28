<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';

  let {
    open = $bindable(false),
    media,
    onDelete,
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

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      <aside class="viewer-sidebar">
        <button class="viewer-close" onclick={close} aria-label={m.shortcuts_close()}>✕</button>

        <input
          type="text"
          class="viewer-title-edit"
          bind:value={captionValue}
          placeholder={media.originalFilename}
          onblur={saveMetadata}
          aria-label="Caption"
        />

        {#if media.description}
          <p class="viewer-desc">{media.description}</p>
        {/if}

        <div class="viewer-notes">
          <textarea
            class="viewer-notes-edit"
            bind:value={notesValue}
            placeholder={m.media_notes_placeholder()}
            onblur={saveMetadata}
            rows="3"
            aria-label={m.media_notes()}
          ></textarea>
        </div>

        <div class="viewer-details">
          <h4>{m.media_details()}</h4>
          <dl>
            <dt>Filename</dt>
            <dd>{media.originalFilename}</dd>
            <dt>Type</dt>
            <dd>{media.mimeType}</dd>
            <dt>Size</dt>
            <dd>{formatSize(media.size)}</dd>
            {#if media.date}
              <dt>{m.media_date_taken()}</dt>
              <dd>{media.date}</dd>
            {/if}
          </dl>
        </div>

        <div class="viewer-actions">
          {#if onSetPrimary}
            <button class="btn-action" onclick={() => onSetPrimary?.(media?.id ?? '')}>
              ⭐ {m.media_set_primary()}
            </button>
          {/if}
          {#if onDelete}
            <button class="btn-danger" onclick={() => onDelete?.(media?.id ?? '')}>
              🗑️ {m.media_delete()}
            </button>
          {/if}
        </div>
      </aside>
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

  .viewer-sidebar {
    width: 300px;
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    overflow-y: auto;
    border-left: 1px solid var(--color-border);
  }

  .viewer-close {
    align-self: flex-end;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    color: var(--color-text-muted);
    transition: all var(--transition-fast);
  }

  .viewer-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .viewer-title-edit {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    word-break: break-word;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text);
    padding: var(--space-1) var(--space-2);
    margin: 0 calc(var(--space-2) * -1);
    border-radius: var(--radius-sm);
    width: calc(100% + var(--space-4));
    outline: none;
    transition: all var(--transition-fast);
  }

  .viewer-title-edit:focus,
  .viewer-title-edit:hover {
    border-color: var(--color-border);
    background: var(--color-surface);
  }

  .viewer-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  .viewer-notes {
    margin-bottom: var(--space-2);
  }

  .viewer-notes-edit {
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
    padding: var(--space-2);
    margin: 0 calc(var(--space-2) * -1);
    border-radius: var(--radius-md);
    width: calc(100% + var(--space-4));
    resize: vertical;
    outline: none;
    transition: all var(--transition-fast);
    font-family: inherit;
    font-size: var(--font-size-sm);
    min-height: 80px;
  }

  .viewer-notes-edit:focus,
  .viewer-notes-edit:hover {
    border-color: var(--color-border);
    background: var(--color-surface);
  }

  .viewer-details h4 {
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .viewer-details dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
  }

  .viewer-details dt {
    color: var(--color-text-muted);
  }

  .viewer-details dd {
    color: var(--color-text-secondary);
    word-break: break-all;
  }

  .viewer-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: auto;
  }

  .btn-action,
  .btn-danger {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
    text-align: left;
  }

  .btn-action {
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);
  }

  .btn-action:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-danger {
    color: var(--color-danger, #ef4444);
    border: 1px solid var(--color-border);
  }

  .btn-danger:hover {
    border-color: var(--color-danger, #ef4444);
    background: rgba(239, 68, 68, 0.1);
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

    .viewer-sidebar {
      width: 100%;
      max-height: 40vh;
      border-left: none;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
