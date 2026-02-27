/**
 * Tree layout algorithm — positions nodes in a binary ancestor pedigree.
 *
 * Pure function. Takes a tree structure and returns positioned nodes
 * ready for SVG rendering.
 *
 * Layout: root at center-bottom, ancestors fan upward.
 * Each generation doubles the number of nodes.
 */

import type { PersonWithDetails } from '$lib/api';

export interface PositionedNode {
  person: PersonWithDetails;
  x: number;
  y: number;
  parentIds: string[];
}

export interface TreeLayoutOptions {
  /** Horizontal gap between siblings at the widest generation. */
  nodeWidth: number;
  /** Vertical gap between generations. */
  nodeHeight: number;
  /** Horizontal spacing multiplier between nodes. */
  horizontalSpacing: number;
}

const DEFAULT_OPTIONS: TreeLayoutOptions = {
  nodeWidth: 180,
  nodeHeight: 120,
  horizontalSpacing: 200,
};

/**
 * Recursive tree data structure. This is structurally identical to
 * mock-data.ts's TreeNode — kept separate so tree-layout stays pure.
 */
export interface TreeData {
  person: PersonWithDetails;
  parents: TreeData[];
}

/**
 * Layout an ancestor pedigree tree.
 *
 * Returns flat array of positioned nodes with x/y coordinates.
 * Root node is at position (0, 0). Parents are above (negative y).
 *
 * @param tree - Recursive tree data structure
 * @param options - Layout configuration
 * @returns Array of positioned nodes
 */
export function layoutAncestorTree(
  tree: TreeData | undefined,
  options: Partial<TreeLayoutOptions> = {},
): PositionedNode[] {
  if (!tree) return [];

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodes: PositionedNode[] = [];

  function traverse(node: TreeData, depth: number, position: number, maxAtDepth: number): void {
    // Calculate x position: center the node within its slot
    const totalWidth = maxAtDepth * opts.horizontalSpacing;
    const slotWidth = totalWidth / maxAtDepth;
    const x = (position - (maxAtDepth - 1) / 2) * slotWidth || 0;

    // y position: each generation moves up
    const y = -depth * opts.nodeHeight || 0;

    nodes.push({
      person: node.person,
      x,
      y,
      parentIds: node.parents.map((p) => p.person.id),
    });

    // Layout parents
    node.parents.forEach((parent, i) => {
      const parentPosition = position * 2 + i;
      const parentMaxAtDepth = maxAtDepth * 2;
      traverse(parent, depth + 1, parentPosition, parentMaxAtDepth);
    });
  }

  traverse(tree, 0, 0, 1);
  return nodes;
}

/**
 * Get the bounding box of all positioned nodes.
 */
export function getTreeBounds(nodes: PositionedNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
