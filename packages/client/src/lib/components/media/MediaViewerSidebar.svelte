<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    media,
    captionValue = $bindable(''),
    notesValue = $bindable(''),
    onSaveMetadata,
    onClose,
    onDelete,
    onUnlink,
    onSetPrimary,
  }: {
    media: {
      id: string;
      type: string;
      originalFilename: string;
      mimeType: string;
      caption?: string | null;
      description?: string | null;
      notes?: string | null;
      date?: string | null;
      size: number;
    };
    captionValue: string;
    notesValue: string;
    onSaveMetadata: () => void;
    onClose: () => void;
    onDelete?: (id: string) => void;
    onUnlink?: (id: string) => void;
    onSetPrimary?: (id: string) => void;
  } = $props();

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<aside class="viewer-sidebar">
  <button class="viewer-close" onclick={onClose} aria-label={m.shortcuts_close()}>✕</button>

  <input
    type="text"
    class="viewer-title-edit"
    bind:value={captionValue}
    placeholder={media.originalFilename}
    onblur={onSaveMetadata}
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
      onblur={onSaveMetadata}
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
      <button class="btn-action" onclick={() => onSetPrimary?.(media.id)}>
        ⭐ {m.media_set_primary()}
      </button>
    {/if}
    {#if onDelete}
      <button class="btn-danger" onclick={() => onDelete?.(media.id)}>
        🗑️ {m.media_delete()}
      </button>
    {/if}
    {#if onUnlink}
      <button class="btn-action" onclick={() => onUnlink?.(media.id)}>
        🔗 {m.media_unlink()}
      </button>
    {/if}
  </div>
</aside>

<style>
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
    color: var(--color-danger);
    border: 1px solid var(--color-border);
  }

  .btn-danger:hover {
    border-color: var(--color-danger);
    background: var(--color-danger-light);
  }

  @media (max-width: 768px) {
    .viewer-sidebar {
      width: 100%;
      max-height: 40vh;
      border-left: none;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
