<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import MediaCard from './MediaCard.svelte';
  import MediaUpload from './MediaUpload.svelte';

  let {
    items = [],
    onUpload,
    onItemClick,
  }: {
    items: {
      link: {
        id: string;
        isPrimary?: boolean | null;
        caption?: string | null;
        sortOrder?: number | null;
      };
      media: { id: string; type: string; originalFilename: string; caption?: string | null };
    }[];
    onUpload?: (files: File[]) => void;
    onItemClick?: (mediaId: string) => void;
  } = $props();
</script>

<section class="media-gallery" aria-label={m.media_gallery()}>
  <div class="gallery-header">
    <h3>{m.media_gallery()}</h3>
    <span class="gallery-count">{items.length}</span>
  </div>

  {#if items.length > 0}
    <div class="gallery-grid">
      {#each items as item (item.link.id)}
        <MediaCard
          media={item.media}
          type={item.media.type}
          isPrimary={item.link.isPrimary ?? false}
          caption={item.link.caption ?? item.media.caption}
          onClick={() => onItemClick?.(item.media.id)}
        />
      {/each}
    </div>
  {:else}
    <p class="gallery-empty">{m.media_gallery_empty()}</p>
  {/if}

  {#if onUpload}
    <div class="gallery-upload">
      <MediaUpload {onUpload} />
    </div>
  {/if}
</section>

<style>
  .media-gallery {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .gallery-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .gallery-header h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .gallery-count {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    padding: 0 var(--space-2);
    border-radius: var(--radius-full);
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-3);
  }

  .gallery-empty {
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-8) 0;
  }

  .gallery-upload {
    margin-top: var(--space-2);
  }

  @media (max-width: 768px) {
    .gallery-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
  }
</style>
