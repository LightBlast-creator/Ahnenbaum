<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    onUpload,
    accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg',
    multiple = true,
  }: {
    onUpload: (files: File[]) => void;
    accept?: string;
    multiple?: boolean;
  } = $props();

  let isDragging = $state(false);
  let fileInput: HTMLInputElement | undefined = $state(undefined);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) onUpload(files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files ?? []);
    if (files.length) onUpload(files);
    // Reset so the same file can be selected again
    target.value = '';
  }

  function handlePaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length) {
      event.preventDefault();
      onUpload(files);
    }
  }

  function openFilePicker() {
    fileInput?.click();
  }
</script>

<svelte:window onpaste={handlePaste} />

<div
  class="upload-zone"
  class:dragging={isDragging}
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  onclick={openFilePicker}
  onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
  role="button"
  tabindex="0"
  aria-label={m.media_upload()}
>
  <div class="upload-icon">
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </div>
  <p class="upload-text">{m.media_upload_drag()}</p>
  <p class="upload-hint">{m.media_upload_paste()}</p>
  <p class="upload-meta">{m.media_file_types()}</p>
  <p class="upload-meta">{m.media_max_size()}</p>
</div>

<input
  bind:this={fileInput}
  type="file"
  {accept}
  {multiple}
  class="file-input-hidden"
  onchange={handleFileSelect}
  aria-hidden="true"
  tabindex="-1"
/>

<style>
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-8) var(--space-6);
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: center;
  }

  .upload-zone:hover,
  .upload-zone.dragging {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .upload-zone.dragging {
    transform: scale(1.01);
  }

  .upload-icon {
    color: var(--color-text-muted);
    transition: color var(--transition-fast);
  }

  .upload-zone:hover .upload-icon,
  .upload-zone.dragging .upload-icon {
    color: var(--color-primary);
  }

  .upload-text {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
  }

  .upload-hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .upload-meta {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  .file-input-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }
</style>
