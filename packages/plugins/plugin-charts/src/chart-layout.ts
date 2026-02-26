/**
 * Chart layout engine — computes positions for tree/fan/timeline layouts.
 *
 * All layout functions return a flat array of positioned nodes
 * ready for rendering by the client-side Svelte component.
 */

export interface ChartNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  parentIds: string[];
}

export interface ChartEdge {
  fromId: string;
  toId: string;
}

export interface PersonRecord {
  id: string;
  givenName?: string;
  familyName?: string;
  sex?: string;
  birthDate?: string;
  deathDate?: string;
}

export interface RelationshipRecord {
  id: string;
  type: string;
  person1Id: string;
  person2Id: string;
}

export interface ChartData {
  nodes: ChartNode[];
  edges: ChartEdge[];
  width: number;
  height: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const H_GAP = 40;
const V_GAP = 80;

/**
 * Compute an ancestor tree layout (going upward from a root person).
 */
export function ancestorLayout(
  rootId: string,
  persons: PersonRecord[],
  relationships: RelationshipRecord[],
): ChartData {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const nodes: ChartNode[] = [];
  const edges: ChartEdge[] = [];
  const visited = new Set<string>();

  // Build parent lookup: childId -> [parentIds]
  const childToParents = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === 'parent') {
      const parents = childToParents.get(rel.person2Id) ?? [];
      parents.push(rel.person1Id);
      childToParents.set(rel.person2Id, parents);
    }
  }

  function layout(personId: string, generation: number, xOffset: number): number {
    if (visited.has(personId)) return 0;
    visited.add(personId);

    const person = personMap.get(personId);
    if (!person) return 0;

    const parentIds = childToParents.get(personId) ?? [];
    let totalWidth = 0;

    // Layout parents first (above)
    if (parentIds.length > 0) {
      let parentX = xOffset;
      for (const parentId of parentIds) {
        const w = layout(parentId, generation - 1, parentX);
        edges.push({ fromId: parentId, toId: personId });
        parentX += w + H_GAP;
        totalWidth += w + H_GAP;
      }
      totalWidth -= H_GAP; // Remove trailing gap
    }

    // This node's width is at least NODE_WIDTH
    const nodeWidth = Math.max(NODE_WIDTH, totalWidth);

    nodes.push({
      id: personId,
      label: [person.givenName, person.familyName].filter(Boolean).join(' ') || personId,
      x: xOffset + nodeWidth / 2 - NODE_WIDTH / 2,
      y: -generation * (NODE_HEIGHT + V_GAP),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      generation,
      parentIds,
    });

    return nodeWidth;
  }

  layout(rootId, 0, 0);

  // Normalize all positions to positive space
  const minX = Math.min(0, ...nodes.map((n) => n.x));
  const minY = Math.min(0, ...nodes.map((n) => n.y));
  for (const node of nodes) {
    node.x -= minX;
    node.y -= minY;
  }

  const width = Math.max(400, ...nodes.map((n) => n.x + n.width)) + H_GAP;
  const height = Math.max(200, ...nodes.map((n) => n.y + n.height)) + V_GAP;

  return { nodes, edges, width, height };
}

/**
 * Compute a descendant tree layout (going downward from a root person).
 */
export function descendantLayout(
  rootId: string,
  persons: PersonRecord[],
  relationships: RelationshipRecord[],
): ChartData {
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const nodes: ChartNode[] = [];
  const edges: ChartEdge[] = [];
  const visited = new Set<string>();

  // Build children lookup: parentId -> [childIds]
  const parentToChildren = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type === 'parent') {
      const children = parentToChildren.get(rel.person1Id) ?? [];
      children.push(rel.person2Id);
      parentToChildren.set(rel.person1Id, children);
    }
  }

  function layout(personId: string, generation: number, xOffset: number): number {
    if (visited.has(personId)) return 0;
    visited.add(personId);

    const person = personMap.get(personId);
    if (!person) return 0;

    const childIds = parentToChildren.get(personId) ?? [];
    let totalWidth = 0;

    if (childIds.length > 0) {
      let childX = xOffset;
      for (const childId of childIds) {
        const w = layout(childId, generation + 1, childX);
        edges.push({ fromId: personId, toId: childId });
        childX += w + H_GAP;
        totalWidth += w + H_GAP;
      }
      totalWidth -= H_GAP;
    }

    const nodeWidth = Math.max(NODE_WIDTH, totalWidth);

    nodes.push({
      id: personId,
      label: [person.givenName, person.familyName].filter(Boolean).join(' ') || personId,
      x: xOffset + nodeWidth / 2 - NODE_WIDTH / 2,
      y: generation * (NODE_HEIGHT + V_GAP),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      generation,
      parentIds: [],
    });

    return nodeWidth;
  }

  layout(rootId, 0, 0);

  const width = Math.max(400, ...nodes.map((n) => n.x + n.width)) + H_GAP;
  const height = Math.max(200, ...nodes.map((n) => n.y + n.height)) + V_GAP;

  return { nodes, edges, width, height };
}
