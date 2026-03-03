<script lang="ts">
  /**
   * ChartView — renders ancestor or descendant charts from the plugin API.
   *
   * Fetches chart data from the plugin-charts server routes and renders
   * positioned SVG nodes with bezier-curve edges. Includes pan & zoom.
   */

  import { goto } from '$app/navigation';
  import { resolveRoute } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';
  import TreeControls from '$lib/components/TreeControls.svelte';
  import ChartNode from './ChartNode.svelte';
  import type { ChartNodeData } from './ChartNode.svelte';

  interface ChartEdge {
    fromId: string;
    toId: string;
  }

  interface ChartData {
    nodes: ChartNodeData[];
    edges: ChartEdge[];
    width: number;
    height: number;
  }

  let {
    personId,
    chartType,
  }: {
    personId: string;
    chartType: 'ancestor' | 'descendant';
  } = $props();

  let chartData = $state<ChartData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

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

  $effect(() => {
    loadChart(personId, chartType);
  });

  async function loadChart(pid: string, type: string) {
    loading = true;
    error = null;
    try {
      chartData = await api.get<ChartData>(`plugin-routes/plugin-charts/${type}-chart/${pid}`);
      requestAnimationFrame(() => fitToScreen());
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load chart';
      chartData = null;
    } finally {
      loading = false;
    }
  }

  // ── Pan & Zoom ──────────────────────────────────────────────────────

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const sensitivity = event.ctrlKey ? 0.005 : 0.002;
    const delta = -event.deltaY * sensitivity;
    scale = Math.max(0.1, Math.min(3, scale * (1 + delta)));
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
    if (!containerEl || !chartData || chartData.nodes.length === 0) return;
    const rect = containerEl.getBoundingClientRect();
    const padding = 80;
    const scaleX = (rect.width - padding * 2) / chartData.width;
    const scaleY = (rect.height - padding * 2) / chartData.height;
    scale = Math.min(scaleX, scaleY, 1.5);

    const midX = chartData.width / 2;
    const midY = chartData.height / 2;
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

  // Build a lookup for node positions to draw edges
  const nodeMap = $derived(new Map((chartData?.nodes ?? []).map((n) => [n.id, n])));

  function handleNodeClick(id: string) {
    goto(resolveRoute('/persons/[id]', { id }));
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="chart-canvas"
  bind:this={containerEl}
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseUp}
  role="application"
  aria-label="{chartType} chart"
  class:panning={isPanning}
>
  {#if loading}
    <div class="chart-status">{m.loading()}</div>
  {:else if error}
    <div class="chart-status chart-error">{error}</div>
  {:else if chartData && chartData.nodes.length > 0}
    <svg class="chart-svg" width="100%" height="100%">
      <g transform="translate({panX}, {panY}) scale({scale})">
        <!-- Edges -->
        {#each chartData.edges as edge (edge.fromId + '-' + edge.toId)}
          {@const from = nodeMap.get(edge.fromId)}
          {@const to = nodeMap.get(edge.toId)}
          {#if from && to}
            <path
              d="M {from.x + from.width / 2} {from.y + from.height}
                 C {from.x + from.width / 2} {(from.y + from.height + to.y) / 2},
                   {to.x + to.width / 2} {(from.y + from.height + to.y) / 2},
                   {to.x + to.width / 2} {to.y}"
              class="chart-edge"
              fill="none"
            />
          {/if}
        {/each}

        <!-- Nodes -->
        {#each chartData.nodes as node (node.id)}
          <ChartNode {node} onClick={handleNodeClick} />
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
  {:else}
    <div class="chart-status">{m.tree_empty()}</div>
  {/if}
</div>

<style>
  .chart-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 500px;
    overflow: hidden;
    background: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
    background-size: 20px 20px;
    cursor: grab;
  }

  .chart-canvas.panning {
    cursor: grabbing;
  }

  .chart-canvas:fullscreen {
    background-color: var(--color-bg);
  }

  .chart-svg {
    width: 100%;
    height: 100%;
  }

  .chart-edge {
    stroke: var(--color-border-hover);
    stroke-width: 2;
  }

  .chart-status {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .chart-error {
    color: var(--color-danger);
  }
</style>
