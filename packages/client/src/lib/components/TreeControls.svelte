<script lang="ts">
  import * as m from '$lib/paraglide/messages';

  let {
    scale,
    onZoomIn,
    onZoomOut,
    onFit,
    onFullscreen,
  }: {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFit: () => void;
    onFullscreen: () => void;
  } = $props();
</script>

<div class="tree-controls" role="toolbar" aria-label="Tree controls">
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
