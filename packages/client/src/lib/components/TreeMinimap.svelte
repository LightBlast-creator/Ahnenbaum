<script lang="ts">
  /**
   * TreeMinimap — zoomed-out tree overview with draggable viewport indicator.
   *
   * Renders all nodes as small rectangles in a fixed overlay.
   * The current viewport is shown as a semi-transparent rectangle
   * that can be dragged for quick navigation.
   */

  import type { PositionedNode } from '$lib/utils/tree-layout';

  let {
    nodes,
    bounds,
    panX,
    panY,
    scale,
    containerWidth,
    containerHeight,
    onPanChange,
  }: {
    nodes: PositionedNode[];
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      width: number;
      height: number;
    };
    panX: number;
    panY: number;
    scale: number;
    containerWidth: number;
    containerHeight: number;
    onPanChange: (panX: number, panY: number) => void;
  } = $props();

  const MINIMAP_WIDTH = 150;
  const MINIMAP_HEIGHT = 100;
  const PADDING = 20;

  // ── Coordinate mapping ─────────────────────────────────────────────
  // Map tree-space coordinates into minimap-space coordinates.

  const treeWidth = $derived(bounds.width + 200 || 1);
  const treeHeight = $derived(bounds.height + 200 || 1);
  const minimapScale = $derived(
    Math.min((MINIMAP_WIDTH - PADDING) / treeWidth, (MINIMAP_HEIGHT - PADDING) / treeHeight),
  );

  const offsetX = $derived(
    (MINIMAP_WIDTH - treeWidth * minimapScale) / 2 -
      bounds.minX * minimapScale +
      100 * minimapScale,
  );
  const offsetY = $derived(
    (MINIMAP_HEIGHT - treeHeight * minimapScale) / 2 -
      bounds.minY * minimapScale +
      100 * minimapScale,
  );

  /** Viewport rect in minimap space. */
  const viewX = $derived((-panX / scale) * minimapScale + offsetX);
  const viewY = $derived((-panY / scale) * minimapScale + offsetY);
  const viewW = $derived((containerWidth / scale) * minimapScale);
  const viewH = $derived((containerHeight / scale) * minimapScale);

  // ── Drag handling ──────────────────────────────────────────────────
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;

  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragStartPanX = panX;
    dragStartPanY = panY;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    // Convert minimap pixel delta to tree-space pan delta
    const newPanX = dragStartPanX - (dx / minimapScale) * scale;
    const newPanY = dragStartPanY - (dy / minimapScale) * scale;
    onPanChange(newPanX, newPanY);
  }

  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  /** Sex-based dot color (matches PersonCard). */
  function sexDotColor(sex: string): string {
    return (
      { male: '#4A90D9', female: '#D94A8C', intersex: '#D9A84A', unknown: '#999' }[sex] ?? '#999'
    );
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tree-minimap" onmousedown={handleMouseDown}>
  <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
    <!-- Node dots -->
    {#each nodes as node (node.person.id)}
      <rect
        x={node.x * minimapScale + offsetX - 3}
        y={node.y * minimapScale + offsetY - 2}
        width="6"
        height="4"
        rx="1"
        fill={sexDotColor(node.person.sex)}
        opacity="0.7"
      />
    {/each}

    <!-- Viewport indicator -->
    <rect x={viewX} y={viewY} width={viewW} height={viewH} class="viewport-rect" />
  </svg>
</div>

<style>
  .tree-minimap {
    position: absolute;
    bottom: var(--space-4);
    left: var(--space-4);
    width: 150px;
    height: 100px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    z-index: var(--z-dropdown);
    cursor: grab;
    overflow: hidden;
    backdrop-filter: blur(8px);
    opacity: 0.9;
  }

  .tree-minimap:active {
    cursor: grabbing;
  }

  .viewport-rect {
    fill: var(--color-primary);
    fill-opacity: 0.15;
    stroke: var(--color-primary);
    stroke-width: 1.5;
    stroke-opacity: 0.6;
  }
</style>
