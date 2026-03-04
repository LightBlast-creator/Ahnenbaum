<script lang="ts">
  import PersonCard from '$lib/components/PersonCard.svelte';
  import TreeControls from '$lib/components/TreeControls.svelte';
  import TreeMinimap from '$lib/components/TreeMinimap.svelte';
  import { getTreeBounds, type PositionedNode } from '$lib/utils/tree-layout';
  import type { GraphConnection, FamilyGroup } from '$lib/utils/family-graph-layout';
  import { CARD_HALF_HEIGHT, CARD_WIDTH } from '$lib/utils/tree-constants';
  import * as m from '$lib/paraglide/messages';

  /** Generation-based color palette: cool→warm gradient (oldest→youngest). */
  const GENERATION_PALETTE = [
    '#6B8EC4', // Gen 0 – steel blue
    '#4DB6AC', // Gen 1 – teal
    '#81C784', // Gen 2 – sage green
    '#FFB74D', // Gen 3 – warm amber
    '#E57373', // Gen 4 – soft coral
    '#BA68C8', // Gen 5 – lavender
  ] as const;

  let {
    nodes,
    connections,
    familyGroups = [],
    onPersonClick,
  }: {
    nodes: PositionedNode[];
    connections: GraphConnection[];
    familyGroups?: FamilyGroup[];
    onPersonClick: (personId: string) => void;
  } = $props();

  // ── Pan and zoom state ─────────────────────────────────────────────
  let scale = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isPanning = $state(false);
  let startPanX = $state(0);
  let startPanY = $state(0);
  let startMouseX = $state(0);
  let startMouseY = $state(0);

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let containerWidth = $state(0);
  let containerHeight = $state(0);

  // ── Persisted preferences ──────────────────────────────────────────
  type ConnectionStyle = 'bezier' | 'orthogonal';
  let connectionStyle = $state<ConnectionStyle>('bezier');
  let minimapVisible = $state(false);

  $effect(() => {
    // SSR-safe: read from localStorage only in browser
    connectionStyle =
      (localStorage.getItem('ahnenbaum-connection-style') as ConnectionStyle) || 'bezier';
    minimapVisible = localStorage.getItem('ahnenbaum-minimap-visible') === 'true';
  });

  function setConnectionStyle(style: ConnectionStyle) {
    connectionStyle = style;
    localStorage.setItem('ahnenbaum-connection-style', style);
  }

  function toggleMinimap() {
    minimapVisible = !minimapVisible;
    localStorage.setItem('ahnenbaum-minimap-visible', String(minimapVisible));
  }

  // ── Derived values ─────────────────────────────────────────────────
  const bounds = $derived(getTreeBounds(nodes));

  /** Unique generation layers for rendering generation labels. */
  const generationLayers = $derived.by(() => {
    const genBuckets: Record<number, number[]> = {};
    for (const node of nodes) {
      (genBuckets[node.generation] ??= []).push(node.y);
    }
    return Object.entries(genBuckets)
      .map(([gen, ys]) => ({
        generation: Number(gen),
        y: ys.reduce((a, b) => a + b, 0) / ys.length,
      }))
      .sort((a, b) => a.y - b.y);
  });

  // ── Animation ──────────────────────────────────────────────────────
  let animationId: number | null = null;

  function animateTo(
    targetPanX: number,
    targetPanY: number,
    targetScale: number,
    durationMs = 300,
  ) {
    // Cancel any in-progress animation
    if (animationId !== null) cancelAnimationFrame(animationId);

    const startTime = performance.now();
    const fromPanX = panX;
    const fromPanY = panY;
    const fromScale = scale;

    function step(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const ease = 1 - (1 - t) ** 3;

      panX = fromPanX + (targetPanX - fromPanX) * ease;
      panY = fromPanY + (targetPanY - fromPanY) * ease;
      scale = fromScale + (targetScale - fromScale) * ease;

      if (t < 1) {
        animationId = requestAnimationFrame(step);
      } else {
        animationId = null;
      }
    }

    animationId = requestAnimationFrame(step);
  }

  // ── Initial fit ────────────────────────────────────────────────────
  let hasFitted = false;
  $effect(() => {
    if (nodes.length > 0 && containerEl && !hasFitted) {
      hasFitted = true;
      requestAnimationFrame(() => fitToScreen(false));
    }
  });

  // Observe container size for minimap
  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  // ── Mouse handlers ─────────────────────────────────────────────────
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
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

  // ── Touch handlers ─────────────────────────────────────────────────
  let touchStartDist = 0;
  let touchStartScale = 1;
  let touchStartPanX = 0;
  let touchStartPanY = 0;
  let touchStartMidX = 0;
  let touchStartMidY = 0;
  let isTouchPanning = false;

  function getTouchDist(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      // Single finger — pan
      isTouchPanning = true;
      startMouseX = event.touches[0].clientX;
      startMouseY = event.touches[0].clientY;
      touchStartPanX = panX;
      touchStartPanY = panY;
    } else if (event.touches.length === 2) {
      // Two fingers — pinch-to-zoom
      isTouchPanning = false;
      touchStartDist = getTouchDist(event.touches);
      touchStartScale = scale;
      touchStartMidX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      touchStartMidY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      touchStartPanX = panX;
      touchStartPanY = panY;
    }
  }

  function handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length === 1 && isTouchPanning) {
      panX = touchStartPanX + (event.touches[0].clientX - startMouseX);
      panY = touchStartPanY + (event.touches[0].clientY - startMouseY);
    } else if (event.touches.length === 2 && touchStartDist > 0) {
      const newDist = getTouchDist(event.touches);
      const newScale = Math.max(0.1, Math.min(3, touchStartScale * (newDist / touchStartDist)));
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      // Adjust pan to keep the pinch center stable
      panX = midX - (touchStartMidX - touchStartPanX) * (newScale / touchStartScale);
      panY = midY - (touchStartMidY - touchStartPanY) * (newScale / touchStartScale);
      scale = newScale;
    }
  }

  function handleTouchEnd() {
    isTouchPanning = false;
    touchStartDist = 0;
  }

  // ── Zoom / fit / center ────────────────────────────────────────────
  function zoomIn() {
    animateTo(panX, panY, Math.min(3, scale * 1.2));
  }

  function zoomOut() {
    animateTo(panX, panY, Math.max(0.1, scale / 1.2));
  }

  function fitToScreen(animated = true) {
    if (!containerEl || nodes.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    const padding = 100;
    const scaleX = (rect.width - padding * 2) / (bounds.width + 220);
    const scaleY = (rect.height - padding * 2) / (bounds.height + 200);
    const targetScale = Math.min(scaleX, scaleY, 1.5);
    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;
    const targetPanX = rect.width / 2 - midX * targetScale;
    const targetPanY = rect.height / 2 - midY * targetScale;

    if (animated) {
      animateTo(targetPanX, targetPanY, targetScale);
    } else {
      panX = targetPanX;
      panY = targetPanY;
      scale = targetScale;
    }
  }

  function centerOnPerson(personId: string) {
    if (!containerEl) return;
    const node = nodes.find((n) => n.person.id === personId);
    if (!node) return;
    const rect = containerEl.getBoundingClientRect();
    const targetPanX = rect.width / 2 - node.x * scale;
    const targetPanY = rect.height / 2 - node.y * scale;
    animateTo(targetPanX, targetPanY, scale);
  }

  function centerOnRoot() {
    if (nodes.length === 0) return;
    centerOnPerson(nodes[0].person.id);
  }

  function toggleFullscreen() {
    if (!containerEl) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerEl.requestFullscreen();
    }
  }

  function handleMinimapPan(newPanX: number, newPanY: number) {
    panX = newPanX;
    panY = newPanY;
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
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
  ontouchcancel={handleTouchEnd}
  role="application"
  aria-label="Family tree"
  class:panning={isPanning}
>
  <svg class="tree-svg" width="100%" height="100%">
    <g transform="translate({panX}, {panY}) scale({scale})">
      <!-- Generation banding (behind everything) -->
      {#each generationLayers as layer, i (layer.generation)}
        <rect
          x={bounds.minX - 300}
          y={layer.y - 70}
          width={bounds.width + 600}
          height="140"
          rx="4"
          class="generation-band"
          class:gen-even={i % 2 === 0}
          class:gen-odd={i % 2 !== 0}
        />
        <text x={bounds.minX - 260} y={layer.y + 5} class="generation-label">
          {m.tree_generation({ n: String(layer.generation + 1) })}
        </text>
      {/each}

      <!-- T-connector family groups — each group in a UNIQUE color -->
      {#each familyGroups as group, i (i)}
        {@const hasMultipleParents = group.parentPositions.length >= 2}
        {@const leftChild = group.childPositions.reduce((a, b) => (a.x < b.x ? a : b))}
        {@const rightChild = group.childPositions.reduce((a, b) => (a.x > b.x ? a : b))}
        {@const groupColor = GENERATION_PALETTE[group.colorIndex % GENERATION_PALETTE.length]}

        <!-- Couple horizontal bond (double line ═ sign, only if 2 parents) -->
        {#if hasMultipleParents}
          {@const leftParent =
            group.parentPositions[0].x < group.parentPositions[1].x
              ? group.parentPositions[0]
              : group.parentPositions[1]}
          {@const rightParent =
            group.parentPositions[0].x < group.parentPositions[1].x
              ? group.parentPositions[1]
              : group.parentPositions[0]}
          <line
            x1={leftParent.x + CARD_WIDTH / 2}
            y1={leftParent.y - 3}
            x2={rightParent.x - CARD_WIDTH / 2}
            y2={rightParent.y - 3}
            stroke={groupColor}
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.8"
          />
          <line
            x1={leftParent.x + CARD_WIDTH / 2}
            y1={leftParent.y + 3}
            x2={rightParent.x - CARD_WIDTH / 2}
            y2={rightParent.y + 3}
            stroke={groupColor}
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.8"
          />
        {/if}

        <!-- Drop line: from couple midpoint down to rail -->
        <line
          x1={group.coupleX}
          y1={group.coupleY}
          x2={group.coupleX}
          y2={group.railY}
          stroke={groupColor}
          stroke-width="2.5"
          stroke-linecap="round"
        />

        <!-- Child rail: horizontal line from couple drop point through all children -->
        {@const railMinX = Math.min(group.coupleX, leftChild.x)}
        {@const railMaxX = Math.max(group.coupleX, rightChild.x)}
        {#if railMinX !== railMaxX}
          <line
            x1={railMinX}
            y1={group.railY}
            x2={railMaxX}
            y2={group.railY}
            stroke={groupColor}
            stroke-width="2.5"
            stroke-linecap="round"
          />
        {/if}

        <!-- Child branches: vertical from rail down to each child -->
        {#each group.childPositions as child (child.id)}
          <line
            x1={child.x}
            y1={group.railY}
            x2={child.x}
            y2={child.y - CARD_HALF_HEIGHT}
            stroke={groupColor}
            stroke-width="2.5"
            stroke-linecap="round"
          />
        {/each}
      {/each}

      <!-- Partner connections (childless couples only — gold double-line) -->
      <!-- Couples with children already have a colored ═ bond from the family group -->
      {#each connections as conn, i (i)}
        {#if conn.type === 'partner'}
          {@const pLeftX = Math.min(conn.x1, conn.x2) + CARD_WIDTH / 2}
          {@const pRightX = Math.max(conn.x1, conn.x2) - CARD_WIDTH / 2}
          {@const pY = (conn.y1 + conn.y2) / 2}
          <line
            x1={pLeftX}
            y1={pY - 3}
            x2={pRightX}
            y2={pY - 3}
            stroke="#d4a853"
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.7"
          />
          <line
            x1={pLeftX}
            y1={pY + 3}
            x2={pRightX}
            y2={pY + 3}
            stroke="#d4a853"
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.7"
          />
        {/if}
      {/each}

      <!-- Person cards (on top of everything) -->
      {#each nodes as node (node.person.id)}
        <PersonCard
          person={node.person}
          x={node.x}
          y={node.y}
          generation={node.generation}
          onClick={onPersonClick}
          onDoubleClick={centerOnPerson}
        />
      {/each}
    </g>
  </svg>

  <!-- Controls -->
  <TreeControls
    {scale}
    {connectionStyle}
    {minimapVisible}
    onZoomIn={zoomIn}
    onZoomOut={zoomOut}
    onFit={() => fitToScreen()}
    onFullscreen={toggleFullscreen}
    onCenterOnRoot={centerOnRoot}
    onConnectionStyleChange={setConnectionStyle}
    onToggleMinimap={toggleMinimap}
  />

  <!-- Minimap -->
  {#if minimapVisible}
    <TreeMinimap
      {nodes}
      {bounds}
      {panX}
      {panY}
      {scale}
      {containerWidth}
      {containerHeight}
      onPanChange={handleMinimapPan}
    />
  {/if}
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
    touch-action: none;
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

  /* (Connection colors are applied inline per family group) */

  /* ── Generation banding ── */
  .generation-band {
    pointer-events: none;
  }

  .generation-band.gen-even {
    fill: var(--color-surface);
    fill-opacity: 0.12;
  }

  .generation-band.gen-odd {
    fill: var(--color-surface);
    fill-opacity: 0.04;
  }

  .generation-label {
    fill: var(--color-text-muted);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-family);
    opacity: 0.5;
    pointer-events: none;
  }
</style>
