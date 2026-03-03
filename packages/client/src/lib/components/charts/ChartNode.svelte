<script lang="ts">
  /**
   * ChartNode — SVG node for chart visualizations.
   *
   * Renders a rounded rectangle with name and optional dates.
   * Reuses design tokens from PersonCard.svelte.
   */

  export interface ChartNodeData {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    generation: number;
    parentIds: string[];
  }

  let {
    node,
    onClick,
  }: {
    node: ChartNodeData;
    onClick?: (id: string) => void;
  } = $props();

  const maxLen = 20;
  const truncatedLabel = $derived(
    node.label.length > maxLen ? node.label.slice(0, maxLen - 1) + '…' : node.label,
  );
</script>

<g
  class="chart-node"
  transform="translate({node.x}, {node.y})"
  role="button"
  tabindex="0"
  onclick={() => onClick?.(node.id)}
  onkeydown={(e) => {
    if (e.key === 'Enter') onClick?.(node.id);
  }}
  aria-label={node.label}
>
  <rect
    width={node.width}
    height={node.height}
    rx="8"
    ry="8"
    class="node-bg"
    class:gen-0={node.generation === 0}
  />

  <text x={node.width / 2} y={node.height / 2 + 5} text-anchor="middle" class="node-label">
    {truncatedLabel}
  </text>
</g>

<style>
  .chart-node {
    cursor: pointer;
  }

  .chart-node:hover .node-bg {
    filter: brightness(0.95);
  }

  .chart-node:focus-visible .node-bg {
    stroke: var(--color-primary);
    stroke-width: 2;
  }

  .node-bg {
    fill: var(--color-surface);
    stroke: var(--color-border);
    stroke-width: 1;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1));
    transition: filter 150ms ease;
  }

  .node-bg.gen-0 {
    fill: var(--color-primary-light);
    stroke: var(--color-primary);
  }

  .node-label {
    fill: var(--color-text);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--font-family);
  }
</style>
