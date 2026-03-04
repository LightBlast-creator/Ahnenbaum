<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  export interface UploadItem {
    file: File;
    progress: number;
    status: 'queued' | 'uploading' | 'success' | 'error';
    error?: string;
  }

  let {
    items = [],
  }: {
    items: UploadItem[];
  } = $props();

  let collapsed = $state(false);

  const doneCount = $derived(items.filter((i) => i.status === 'success').length);
  const errorCount = $derived(items.filter((i) => i.status === 'error').length);
  const allDone = $derived(items.length > 0 && doneCount + errorCount === items.length);

  const typeIcons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    application: '📄',
  };

  function getPreviewUrl(file: File): string | null {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }

  function getTypeIcon(file: File): string {
    const major = file.type.split('/')[0];
    return typeIcons[major] ?? '📎';
  }

  function truncate(name: string, max = 25): string {
    if (name.length <= max) return name;
    const ext = name.lastIndexOf('.');
    if (ext > 0 && name.length - ext <= 6) {
      const base = name.slice(0, max - (name.length - ext) - 1);
      return `${base}…${name.slice(ext)}`;
    }
    return `${name.slice(0, max - 1)}…`;
  }
</script>

{#if items.length > 0}
  <div class="upload-progress" class:all-done={allDone}>
    <button class="progress-header" onclick={() => (collapsed = !collapsed)}>
      <span class="progress-summary">
        {#if allDone}
          ✓ {m.media_upload_complete()}
        {:else}
          {m.media_upload_items({ done: String(doneCount), total: String(items.length) })}
        {/if}
      </span>
      <span class="progress-chevron" class:collapsed>{collapsed ? '▴' : '▾'}</span>
    </button>

    {#if !collapsed}
      <div class="progress-list">
        {#each items as item (item.file.name + item.file.lastModified)}
          {@const previewUrl = getPreviewUrl(item.file)}
          <div class="progress-item" class:error={item.status === 'error'}>
            <div class="item-preview">
              {#if previewUrl}
                <img src={previewUrl} alt="" class="item-thumb" />
              {:else}
                <span class="item-icon">{getTypeIcon(item.file)}</span>
              {/if}
            </div>
            <div class="item-info">
              <span class="item-name">{truncate(item.file.name)}</span>
              {#if item.status === 'uploading' || item.status === 'queued'}
                <div class="item-bar">
                  <div class="item-bar-fill" style="width: {item.progress}%"></div>
                </div>
              {/if}
              {#if item.status === 'error' && item.error}
                <span class="item-error">{item.error}</span>
              {/if}
            </div>
            <div class="item-status">
              {#if item.status === 'queued'}
                <span class="status-queued">⏳</span>
              {:else if item.status === 'uploading'}
                <span class="status-uploading">⟳</span>
              {:else if item.status === 'success'}
                <span class="status-success">✓</span>
              {:else if item.status === 'error'}
                <span class="status-error">✗</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .upload-progress {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    width: 340px;
    max-height: 400px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-modal, 100);
    overflow: hidden;
    animation: slide-up 200ms ease;
  }

  .upload-progress.all-done {
    border-color: var(--color-success, #22c55e);
  }

  .progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-secondary);
    border: none;
    width: 100%;
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    transition: background var(--transition-fast);
  }

  .progress-header:hover {
    background: var(--color-surface-hover);
  }

  .progress-chevron {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    transition: transform var(--transition-fast);
  }

  .progress-list {
    max-height: 300px;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .progress-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .progress-item:hover {
    background: var(--color-bg-secondary);
  }

  .progress-item.error {
    background: rgba(239, 68, 68, 0.05);
  }

  .item-preview {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary);
  }

  .item-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .item-icon {
    font-size: 1rem;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-name {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-bar {
    height: 3px;
    background: var(--color-bg-secondary);
    border-radius: 2px;
    margin-top: var(--space-1);
    overflow: hidden;
  }

  .item-bar-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 150ms ease;
  }

  .item-error {
    font-size: var(--font-size-xs);
    color: var(--color-danger, #ef4444);
    display: block;
    margin-top: 2px;
  }

  .item-status {
    flex-shrink: 0;
    width: 20px;
    text-align: center;
    font-size: var(--font-size-sm);
  }

  .status-queued {
    opacity: 0.5;
  }

  .status-uploading {
    color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  .status-success {
    color: var(--color-success, #22c55e);
    font-weight: var(--font-weight-bold);
  }

  .status-error {
    color: var(--color-danger, #ef4444);
    font-weight: var(--font-weight-bold);
  }

  @keyframes slide-up {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .upload-progress {
      left: var(--space-2);
      right: var(--space-2);
      width: auto;
    }
  }
</style>
