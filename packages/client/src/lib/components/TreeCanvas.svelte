<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import PersonCard from '$lib/components/PersonCard.svelte';
  import TreeControls from '$lib/components/TreeControls.svelte';
  import { layoutAncestorTree, getTreeBounds, type PositionedNode } from '$lib/utils/tree-layout';
  import type { TreeData } from '$lib/utils/tree-layout';

  let {
    treeData,
    onPersonClick,
  }: {
    treeData: TreeData | undefined;
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

  const nodes = $derived(layoutAncestorTree(treeData));
  const bounds = $derived(getTreeBounds(nodes));

  // Center the tree on initial load
  $effect(() => {
    if (nodes.length > 0 && containerEl) {
      const rect = containerEl.getBoundingClientRect();
      panX = rect.width / 2;
      panY = rect.height - 100; // Root near bottom
    }
  });

  // Generate connection lines between parents and children
  const connections = $derived.by(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const nodeMap = new SvelteMap<string, PositionedNode>();
    for (const node of nodes) {
      nodeMap.set(node.person.id, node);
    }

    for (const node of nodes) {
      for (const parentId of node.parentIds) {
        const parent = nodeMap.get(parentId);
        if (parent) {
          lines.push({
            x1: node.x,
            y1: node.y - 40, // top of child card
            x2: parent.x,
            y2: parent.y + 40, // bottom of parent card
          });
        }
      }
    }
    return lines;
  });

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(0.25, Math.min(3, scale * delta));
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Left click only
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
    scale = Math.max(0.25, scale / 1.2);
  }

  function fitToScreen() {
    if (!containerEl || nodes.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    const padding = 100;
    const scaleX = (rect.width - padding * 2) / (bounds.width + 200);
    const scaleY = (rect.height - padding * 2) / (bounds.height + 200);
    scale = Math.min(scaleX, scaleY, 1.5);
    panX = rect.width / 2;
    panY = rect.height - 100;
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
        <path
          d="M {conn.x1} {conn.y1} C {conn.x1} {(conn.y1 + conn.y2) / 2}, {conn.x2} {(conn.y1 +
            conn.y2) /
            2}, {conn.x2} {conn.y2}"
          class="tree-connection"
          fill="none"
        />
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
</style>
