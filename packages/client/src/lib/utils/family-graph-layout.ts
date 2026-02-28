/**
 * Family graph layout — Sugiyama-lite layered DAG for full-family overview.
 *
 * Produces a top-down generational layout:
 *   - Oldest ancestors at the top (lowest Y / gen 0)
 *   - Youngest descendants at the bottom (highest Y)
 *   - Partners placed side-by-side within the same generation
 *
 * Pure function — no side effects.
 */

import { PARENT_CHILD_TYPES } from '@ahnenbaum/core';
import type { PersonWithDetails } from '$lib/api';
import type { PositionedNode } from '$lib/utils/tree-layout';

// ── Types ────────────────────────────────────────────────────────────

/** A typed connection line between two nodes. */
export interface GraphConnection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'parent-child' | 'partner';
}

/** Input edge from the server — minimal fields needed for layout. */
export interface GraphEdge {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
}

/** Result of layoutFamilyGraph. */
export interface GraphLayout {
  nodes: PositionedNode[];
  connections: GraphConnection[];
}

// ── Constants ────────────────────────────────────────────────────────

const PARENT_CHILD_SET = new Set<string>(PARENT_CHILD_TYPES);
const HORIZONTAL_SPACING = 200; // px between nodes within a generation
const VERTICAL_SPACING = 160; // px between generations

// ── Layout algorithm ─────────────────────────────────────────────────

/**
 * Lay out a full family graph.
 *
 * @param persons - All persons in the family, as PersonWithDetails
 * @param edges   - All relationships (from getFullFamilyTree server response)
 */
export function layoutFamilyGraph(persons: PersonWithDetails[], edges: GraphEdge[]): GraphLayout {
  if (persons.length === 0) return { nodes: [], connections: [] };

  // ── Step 1: Build adjacency maps ─────────────────────────────────

  // parents[childId] = Set<parentId>
  const parentsOf = new Map<string, Set<string>>();
  // children[parentId] = Set<childId>
  const childrenOf = new Map<string, Set<string>>();
  // partners[personId] = Set<partnerId>
  const partnersOf = new Map<string, Set<string>>();

  const personIds = new Set(persons.map((p) => p.id));

  for (const edge of edges) {
    // Only process edges where both ends exist (guard against orphan refs)
    if (!personIds.has(edge.personAId) || !personIds.has(edge.personBId)) continue;

    if (PARENT_CHILD_SET.has(edge.type)) {
      // personA = parent, personB = child
      const pSet = parentsOf.get(edge.personBId) ?? new Set<string>();
      pSet.add(edge.personAId);
      parentsOf.set(edge.personBId, pSet);

      const cSet = childrenOf.get(edge.personAId) ?? new Set<string>();
      cSet.add(edge.personBId);
      childrenOf.set(edge.personAId, cSet);
    } else {
      // Partner relationship — symmetric
      const aSet = partnersOf.get(edge.personAId) ?? new Set<string>();
      aSet.add(edge.personBId);
      partnersOf.set(edge.personAId, aSet);

      const bSet = partnersOf.get(edge.personBId) ?? new Set<string>();
      bSet.add(edge.personAId);
      partnersOf.set(edge.personBId, bSet);
    }
  }

  // Infer implicit co-parent partnerships: if two people share a child
  // but have no explicit partner edge, treat them as same-generation.
  for (const [, parentIds] of parentsOf.entries()) {
    const parents = [...parentIds];
    for (let i = 0; i < parents.length; i++) {
      for (let j = i + 1; j < parents.length; j++) {
        const a = parents[i];
        const b = parents[j];
        if (!partnersOf.get(a)?.has(b)) {
          const aSet = partnersOf.get(a) ?? new Set<string>();
          aSet.add(b);
          partnersOf.set(a, aSet);

          const bSet = partnersOf.get(b) ?? new Set<string>();
          bSet.add(a);
          partnersOf.set(b, bSet);
        }
      }
    }
  }

  // ── Step 2: Assign generations (longest-path BFS) ────────────────

  // generation[personId] = generation number (0 = oldest root)
  const generation = new Map<string, number>();

  // Find root persons — those who are never a child in a parent-child relationship
  const rootIds = persons
    .filter((p) => !parentsOf.has(p.id) || (parentsOf.get(p.id)?.size ?? 0) === 0)
    .map((p) => p.id);

  // BFS queue: [personId, gen]
  const queue: [string, number][] = rootIds.map((id) => [id, 0]);

  while (queue.length > 0) {
    const entry = queue.shift();
    if (!entry) break;
    const [personId, gen] = entry;

    // Longest-path: only update if this path is longer
    const existing = generation.get(personId);
    if (existing !== undefined && existing >= gen) continue;

    generation.set(personId, gen);

    // Assign partners to the same generation
    for (const partnerId of partnersOf.get(personId) ?? []) {
      const pGen = generation.get(partnerId);
      if (pGen === undefined || pGen < gen) {
        queue.push([partnerId, gen]);
      }
    }

    // Push children one generation down
    for (const childId of childrenOf.get(personId) ?? []) {
      const cGen = generation.get(childId);
      if (cGen === undefined || cGen < gen + 1) {
        queue.push([childId, gen + 1]);
      }
    }
  }

  // ── Step 2b: Correct generation gaps from partner-pull cascading ──
  // When children get pulled to higher gens through partner relationships,
  // their parents may be too far above. Iterate until stable.
  let changed = true;
  while (changed) {
    changed = false;

    // Pull parents down: parent.gen should be min(child.gen) - 1
    for (const [parentId, children] of childrenOf.entries()) {
      const parentGen = generation.get(parentId);
      if (parentGen === undefined) continue;
      let minChildGen = Infinity;
      for (const childId of children) {
        const cg = generation.get(childId);
        if (cg !== undefined && cg < minChildGen) minChildGen = cg;
      }
      if (minChildGen !== Infinity && parentGen < minChildGen - 1) {
        generation.set(parentId, minChildGen - 1);
        changed = true;
      }
    }

    // Push children down: child.gen should be >= parent.gen + 1
    for (const [parentId, children] of childrenOf.entries()) {
      const parentGen = generation.get(parentId);
      if (parentGen === undefined) continue;
      for (const childId of children) {
        const cg = generation.get(childId);
        if (cg !== undefined && cg < parentGen + 1) {
          generation.set(childId, parentGen + 1);
          changed = true;
        }
      }
    }

    // Sync partners to share the max gen
    for (const [personId, partners] of partnersOf.entries()) {
      const pg = generation.get(personId);
      if (pg === undefined) continue;
      for (const partnerId of partners) {
        const partnerGen = generation.get(partnerId);
        if (partnerGen !== undefined && partnerGen < pg) {
          generation.set(partnerId, pg);
          changed = true;
        }
      }
    }
  }

  // Handle disconnected persons (no relationships at all) — assign to gen 0
  for (const person of persons) {
    if (!generation.has(person.id)) {
      generation.set(person.id, 0);
    }
  }

  // ── Step 3: Group persons by generation ──────────────────────────

  const byGen = new Map<number, string[]>();
  for (const [personId, gen] of generation.entries()) {
    const row = byGen.get(gen) ?? [];
    row.push(personId);
    byGen.set(gen, row);
  }

  // ── Step 4: Order within each generation (partners adjacent) ─────

  for (const [gen, ids] of byGen.entries()) {
    const ordered: string[] = [];
    const placed = new Set<string>();
    const idsInGen = new Set(ids); // O(1) lookup instead of O(n) includes()

    for (const id of ids) {
      if (placed.has(id)) continue;
      ordered.push(id);
      placed.add(id);
      // Place partners immediately after this person (if they're in the same generation)
      for (const partnerId of partnersOf.get(id) ?? []) {
        if (!placed.has(partnerId) && idsInGen.has(partnerId)) {
          ordered.push(partnerId);
          placed.add(partnerId);
        }
      }
    }

    byGen.set(gen, ordered);
  }

  // ── Step 5: Assign coordinates ───────────────────────────────────

  const personById = new Map(persons.map((p) => [p.id, p]));
  const positionOf = new Map<string, { x: number; y: number }>();
  const nodes: PositionedNode[] = [];

  for (const [gen, ids] of byGen.entries()) {
    const y = gen * VERTICAL_SPACING;
    const totalWidth = (ids.length - 1) * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2; // center the row

    ids.forEach((id, idx) => {
      const x = startX + idx * HORIZONTAL_SPACING;
      positionOf.set(id, { x, y });

      const person = personById.get(id);
      if (!person) return;

      nodes.push({
        person,
        x,
        y,
        parentIds: [...(parentsOf.get(id) ?? [])],
      });
    });
  }

  // ── Step 6: Generate typed connection lines ───────────────────────

  const connections: GraphConnection[] = [];
  const processedPartnerPairs = new Set<string>();

  for (const node of nodes) {
    const { x, y } = positionOf.get(node.person.id) ?? { x: 0, y: 0 };

    // Parent-child connections: from top-center of child to bottom-center of parent
    for (const parentId of node.parentIds) {
      const parentPos = positionOf.get(parentId);
      if (!parentPos) continue;
      connections.push({
        x1: x,
        y1: y - 40, // top of child card
        x2: parentPos.x,
        y2: parentPos.y + 40, // bottom of parent card
        type: 'parent-child',
      });
    }

    // Partner connections: horizontal line between partners (deduplicated)
    for (const partnerId of partnersOf.get(node.person.id) ?? []) {
      const pairKey = [node.person.id, partnerId].sort().join('|');
      if (processedPartnerPairs.has(pairKey)) continue;
      processedPartnerPairs.add(pairKey);

      const partnerPos = positionOf.get(partnerId);
      if (!partnerPos) continue;

      connections.push({
        x1: x,
        y1: y,
        x2: partnerPos.x,
        y2: partnerPos.y,
        type: 'partner',
      });
    }
  }

  return { nodes, connections };
}
