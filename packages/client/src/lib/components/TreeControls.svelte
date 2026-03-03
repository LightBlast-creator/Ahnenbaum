<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    scale,
    connectionStyle = 'bezier',
    minimapVisible = false,
    onZoomIn,
    onZoomOut,
    onFit,
    onFullscreen,
    onCenterOnRoot,
    onConnectionStyleChange,
    onToggleMinimap,
  }: {
    scale: number;
    connectionStyle?: 'bezier' | 'orthogonal';
    minimapVisible?: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onFullscreen: () => void;
    onCenterOnRoot?: () => void;
    onConnectionStyleChange?: (style: 'bezier' | 'orthogonal') => void;
    onToggleMinimap?: () => void;
  } = $props();

  function toggleConnectionStyle() {
    onConnectionStyleChange?.(connectionStyle === 'bezier' ? 'orthogonal' : 'bezier');
  }
</script>

<div class="tree-controls" role="toolbar" aria-label="Tree controls">
  <!-- Zoom controls -->
  <button onclick={onZoomIn} aria-label={m.tree_zoom_in()} title={m.tree_zoom_in()}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      ><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
    >
  </button>

  <span class="zoom-level">{Math.round(scale * 100)}%</span>

  <button onclick={onZoomOut} aria-label={m.tree_zoom_out()} title={m.tree_zoom_out()}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"><line x1="5" y1="12" x2="19" y2="12" /></svg
    >
  </button>

  <div class="divider"></div>

  <!-- Fit to screen -->
  <button onclick={onFit} aria-label={m.tree_fit()} title={m.tree_fit()}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      ><path
        d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
      /></svg
    >
  </button>

  <!-- Center on root -->
  {#if onCenterOnRoot}
    <button onclick={onCenterOnRoot} aria-label={m.tree_center_root()} title={m.tree_center_root()}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line
          x1="12"
          y1="18"
          x2="12"
          y2="22"
        /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg
      >
    </button>
  {/if}

  <!-- Fullscreen -->
  <button onclick={onFullscreen} aria-label={m.tree_fullscreen()} title={m.tree_fullscreen()}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      ><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line
        x1="21"
        y1="3"
        x2="14"
        y2="10"
      /><line x1="3" y1="21" x2="10" y2="14" /></svg
    >
  </button>

  {#if onConnectionStyleChange}
    <div class="divider"></div>

    <!-- Connection style toggle -->
    <button
      onclick={toggleConnectionStyle}
      aria-label={m.tree_connection_style()}
      title={connectionStyle === 'bezier'
        ? m.tree_connection_orthogonal()
        : m.tree_connection_bezier()}
      class:active={connectionStyle === 'orthogonal'}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        {#if connectionStyle === 'bezier'}
          <!-- Bezier icon: curved path -->
          <path d="M4 20 C 4 10, 20 14, 20 4" />
          <circle cx="4" cy="20" r="2" fill="currentColor" />
          <circle cx="20" cy="4" r="2" fill="currentColor" />
        {:else}
          <!-- Orthogonal icon: right-angle path -->
          <path d="M4 20 V 12 H 20 V 4" />
          <circle cx="4" cy="20" r="2" fill="currentColor" />
          <circle cx="20" cy="4" r="2" fill="currentColor" />
        {/if}
      </svg>
    </button>
  {/if}

  {#if onToggleMinimap}
    <!-- Minimap toggle -->
    <button
      onclick={onToggleMinimap}
      aria-label={m.tree_minimap()}
      title={m.tree_minimap()}
      class:active={minimapVisible}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        ><rect x="3" y="3" width="18" height="18" rx="2" /><rect
          x="7"
          y="7"
          width="6"
          height="5"
          rx="1"
          fill="currentColor"
          opacity="0.3"
        /></svg
      >
    </button>
  {/if}
</div>

<style>
  .tree-controls {
    position: absolute;
    bottom: var(--space-4);
    right: var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    z-index: var(--z-dropdown);
  }

  .tree-controls button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .tree-controls button:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .tree-controls button.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .zoom-level {
    font-size: var(--font-size-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 40px;
    text-align: center;
  }

  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-border);
    margin: 0 var(--space-1);
  }
</style>
