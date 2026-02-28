<script lang="ts">
  import PersonCard from '$lib/components/PersonCard.svelte';
  import TreeControls from '$lib/components/TreeControls.svelte';
  import { getTreeBounds, type PositionedNode } from '$lib/utils/tree-layout';
  import type { GraphConnection } from '$lib/utils/family-graph-layout';

  let {
    nodes,
    connections,
    onPersonClick,
  }: {
    nodes: PositionedNode[];
    connections: GraphConnection[];
    onPersonClick: (personId: string) => void;
  } = $props();

  // Pan and zoom state
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let startPanX = $state(0);
  let startPanY = $state(0);
  let startMouseX = $state(0);
  let startMouseY = $state(0);

  let containerEl: HTMLDivElement | undefined = $state(undefined);

  const bounds = $derived(getTreeBounds(nodes));

  // Center the tree on initial load, then fit to screen
  let hasFitted = false;
  $effect(() => {
    if (nodes.length > 0 && containerEl && !hasFitted) {
      hasFitted = true;
      // Use requestAnimationFrame so the container has its final dimensions
      requestAnimationFrame(() => fitToScreen());
    }
  });

  function handleWheel(event: WheelEvent) {
    event.preventDefault();

    // ctrlKey is set for trackpad pinch-to-zoom gestures
    const sensitivity = event.ctrlKey ? 0.005 : 0.002;
    const delta = -event.deltaY * sensitivity;
    const newScale = scale * (1 + delta);
    scale = Math.max(0.1, Math.min(3, newScale));
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    isPanning = true;
    startMouseX = event.clientX;
    startMouseY = event.clientY;
    startPanX = panX;
    startPanY = panY;
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isPanning) return;
    panX = startPanX + (event.clientX - startMouseX);
    panY = startPanY + (event.clientY - startMouseY);
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function zoomIn() {
    scale = Math.min(3, scale * 1.2);
  }

  function zoomOut() {
    scale = Math.max(0.1, scale / 1.2);
  }

  function fitToScreen() {
    if (!containerEl || nodes.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    const padding = 100;
    const scaleX = (rect.width - padding * 2) / (bounds.width + 200);
    const scaleY = (rect.height - padding * 2) / (bounds.height + 200);
    scale = Math.min(scaleX, scaleY, 1.5);
    // Re-center after scale change
    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;
    panX = rect.width / 2 - midX * scale;
    panY = rect.height / 2 - midY * scale;
  }

  function toggleFullscreen() {
    if (!containerEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerEl.requestFullscreen();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="tree-canvas"
  bind:this={containerEl}
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  role="application"
  aria-label="Family tree"
  class:panning={isPanning}
>
  <svg class="tree-svg" width="100%" height="100%">
    <g transform="translate({panX}, {panY}) scale({scale})">
      <!-- Connection lines -->
      {#each connections as conn, i (i)}
        {#if conn.type === 'partner'}
          <!-- Partner: straight horizontal dashed line -->
          <line
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            class="tree-connection partner-connection"
          />
          <text
            x={(conn.x1 + conn.x2) / 2}
            y={conn.y1 - 6}
            text-anchor="middle"
            class="connection-label">♥</text
          >
        {:else}
          <!-- Parent-child: cubic bezier curve -->
          <path
            d="M {conn.x1} {conn.y1} C {conn.x1} {(conn.y1 + conn.y2) / 2}, {conn.x2} {(conn.y1 +
              conn.y2) /
              2}, {conn.x2} {conn.y2}"
            class="tree-connection"
            fill="none"
          />
        {/if}
      {/each}

      <!-- Person cards -->
      {#each nodes as node (node.person.id)}
        <PersonCard person={node.person} x={node.x} y={node.y} onClick={onPersonClick} />
      {/each}
    </g>
  </svg>

  <TreeControls
    {scale}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
    onFit={fitToScreen}
    onFullscreen={toggleFullscreen}
  />
</div>

<style>
  .tree-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 500px;
    overflow: hidden;
    background: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
    background-size: 20px 20px;
    cursor: grab;
  }

  .tree-canvas.panning {
    cursor: grabbing;
  }

  .tree-canvas:fullscreen {
    background-color: var(--color-bg);
  }

  .tree-svg {
    width: 100%;
    height: 100%;
  }

  .tree-connection {
    stroke: var(--color-border-hover);
    stroke-width: 2;
  }

  .partner-connection {
    stroke-dasharray: 6 4;
    stroke: var(--color-primary-light);
  }

  .connection-label {
    fill: var(--color-text-muted);
    font-size: 10px;
    font-family: var(--font-family);
    pointer-events: none;
  }
</style>
