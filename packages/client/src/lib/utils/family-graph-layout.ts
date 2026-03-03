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
import { CARD_HALF_HEIGHT } from '$lib/utils/tree-constants';

// ── Types ────────────────────────────────────────────────────────────

/** A typed connection line between two nodes. */
export interface GraphConnection {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'parent-child' | 'partner';
}

/** A family unit: one or two parents with their shared children. */
export interface FamilyGroup {
  parentIds: string[];
  childIds: string[];
  /** X midpoint between parents (or single parent X). */
  coupleX: number;
  /** Y of the parent row (bottom of parent card). */
  coupleY: number;
  /** Y of the horizontal child rail (staggered if multiple groups overlap). */
  railY: number;
  /** Positions of each child (for branch rendering). */
  childPositions: { id: string; x: number; y: number }[];
  /** Positions of each parent. */
  parentPositions: { id: string; x: number; y: number }[];
  /** Color palette index for unique per-group coloring. */
  colorIndex: number;
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
  familyGroups: FamilyGroup[];
}

// ── Constants ────────────────────────────────────────────────────────

const PARENT_CHILD_SET = new Set<string>(PARENT_CHILD_TYPES);
// (horizontal spacing is now variable — see PARTNER_GAP, SIBLING_GAP, FAMILY_GAP)
const VERTICAL_SPACING = 160; // px between generations
const RAIL_STAGGER = 12; // px offset between overlapping rails

// ── Shared family group utilities ────────────────────────────────────

/**
 * Build FamilyGroup T-connector data from positioned nodes.
 *
 * Groups children by their shared parent set, computes couple/rail
 * coordinates for each group. Reusable by both full-family and
 * ancestor pedigree modes.
 *
 * @param nodes      - Positioned nodes with parentIds
 * @param positionOf - Map of personId → { x, y }
 * @param generation - Map of personId → generation number (for color coding)
 */
export function buildFamilyGroups(
  nodes: PositionedNode[],
  positionOf: Map<string, { x: number; y: number }>,
  generation?: Map<string, number>,
): FamilyGroup[] {
  // Group children by shared parent set (key = sorted parent IDs)
  const familyMap = new Map<string, { parentIds: string[]; childIds: string[] }>();

  for (const node of nodes) {
    if (node.parentIds.length === 0) continue;
    const key = [...node.parentIds].sort().join('|');
    const existing = familyMap.get(key);
    if (existing) {
      existing.childIds.push(node.person.id);
    } else {
      familyMap.set(key, {
        parentIds: [...node.parentIds],
        childIds: [node.person.id],
      });
    }
  }

  const groups: FamilyGroup[] = [];

  for (const [, family] of familyMap.entries()) {
    const parentPositions = family.parentIds
      .map((id) => {
        const pos = positionOf.get(id);
        return pos ? { id, x: pos.x, y: pos.y } : null;
      })
      .filter((p): p is { id: string; x: number; y: number } => p !== null);

    const childPositions = family.childIds
      .map((id) => {
        const pos = positionOf.get(id);
        return pos ? { id, x: pos.x, y: pos.y } : null;
      })
      .filter((p): p is { id: string; x: number; y: number } => p !== null);

    if (parentPositions.length === 0 || childPositions.length === 0) continue;

    const coupleX = parentPositions.reduce((sum, p) => sum + p.x, 0) / parentPositions.length;
    const coupleY = parentPositions[0].y + CARD_HALF_HEIGHT;
    const childY = childPositions[0].y - CARD_HALF_HEIGHT;
    const railY = (coupleY + childY) / 2;

    groups.push({
      parentIds: family.parentIds,
      childIds: family.childIds,
      coupleX,
      coupleY,
      railY,
      childPositions,
      parentPositions,
      colorIndex: generation?.get(family.parentIds[0]) ?? 0,
    });
  }

  return groups;
}

/**
 * Stagger overlapping rails so parallel horizontal lines don't overlap.
 * Mutates the railY of each group in place.
 */
export function staggerFamilyGroupRails(groups: FamilyGroup[]): void {
  const railBuckets = new Map<number, FamilyGroup[]>();
  for (const group of groups) {
    const key = Math.round(group.railY);
    const bucket = railBuckets.get(key) ?? [];
    bucket.push(group);
    railBuckets.set(key, bucket);
  }
  for (const [, bucket] of railBuckets.entries()) {
    const count = bucket.length;
    for (let i = 0; i < count; i++) {
      bucket[i].railY += (i - (count - 1) / 2) * RAIL_STAGGER;
    }
  }
}

// ── Layout algorithm ─────────────────────────────────────────────────

/**
 * Lay out a full family graph.
 *
 * @param persons - All persons in the family, as PersonWithDetails
 * @param edges   - All relationships (from getFullFamilyTree server response)
 */
export function layoutFamilyGraph(persons: PersonWithDetails[], edges: GraphEdge[]): GraphLayout {
  if (persons.length === 0) return { nodes: [], connections: [], familyGroups: [] };

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

  // ── Steps 4+5: Build placement groups & assign positions ──────────
  //
  // KISS: one pass per generation, top-to-bottom.
  //
  // A "placement group" = siblings (same parents) + their married-in partners.
  //   Married-in = in-generation partner who has NO parents in this tree.
  //
  // Gen 0:  groups placed left→right, centered at X=0.
  // Gen N>0: each group centered under the mean X of its parents,
  //          overlaps resolved by pushing groups right.

  const PARTNER_GAP = 210;
  const SIBLING_GAP = 240;
  const FAMILY_GAP = 300;

  const personById = new Map(persons.map((p) => [p.id, p]));
  const positionOf = new Map<string, { x: number; y: number }>();
  const nodes: PositionedNode[] = [];
  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);

  for (const gen of sortedGens) {
    const ids = byGen.get(gen) ?? [];
    const y = gen * VERTICAL_SPACING;
    const idsInGen = new Set(ids);

    // ── Who has parents in the tree? ──
    const hasParents = new Set<string>();
    for (const id of ids) {
      const p = parentsOf.get(id);
      if (p && p.size > 0) hasParents.add(id);
    }

    // ── Group siblings by parent key ──
    const sibMap = new Map<string, string[]>();
    for (const id of ids) {
      if (!hasParents.has(id)) continue;
      const key = [...(parentsOf.get(id) ?? [])].sort().join('|');
      const arr = sibMap.get(key) ?? [];
      arr.push(id);
      sibMap.set(key, arr);
    }

    // ── Build placement groups ──
    const placed = new Set<string>();
    const groups: { members: string[]; parentIds: string[] }[] = [];

    // Sibling groups first (each pulls in married-in partners)
    for (const [, siblings] of sibMap.entries()) {
      const members: string[] = [];
      const parentIds = [...(parentsOf.get(siblings[0]) ?? [])];
      for (const sib of siblings) {
        if (placed.has(sib)) continue;
        members.push(sib);
        placed.add(sib);
        // Pull married-in partners (no parents in tree)
        for (const pid of partnersOf.get(sib) ?? []) {
          if (!placed.has(pid) && idsInGen.has(pid) && !hasParents.has(pid)) {
            members.push(pid);
            placed.add(pid);
          }
        }
      }
      if (members.length > 0) groups.push({ members, parentIds });
    }

    // Remaining people → own groups (couples/singles with no parents)
    for (const id of ids) {
      if (placed.has(id)) continue;
      const members = [id];
      placed.add(id);
      for (const pid of partnersOf.get(id) ?? []) {
        if (!placed.has(pid) && idsInGen.has(pid)) {
          members.push(pid);
          placed.add(pid);
        }
      }
      groups.push({ members, parentIds: [] });
    }

    // ── Compute internal layout per group ──
    interface LG {
      members: string[];
      offsets: number[]; // X offsets relative to group center
      width: number;
      targetX: number;
    }

    const lgs: LG[] = [];

    for (const g of groups) {
      const xs = [0];
      let cursor = 0;
      for (let i = 1; i < g.members.length; i++) {
        const a = g.members[i - 1];
        const b = g.members[i];
        const partner =
          (partnersOf.get(a) ?? new Set()).has(b) || (partnersOf.get(b) ?? new Set()).has(a);
        cursor += partner ? PARTNER_GAP : SIBLING_GAP;
        xs.push(cursor);
      }
      const width = cursor;
      const mid = width / 2;
      const offsets = xs.map((x) => x - mid);

      // Target center = mean X of parents (or 0 for roots)
      let targetX = 0;
      let cnt = 0;
      for (const pid of g.parentIds) {
        const pos = positionOf.get(pid);
        if (pos) {
          targetX += pos.x;
          cnt++;
        }
      }
      if (cnt > 0) targetX /= cnt;

      lgs.push({ members: g.members, offsets, width, targetX });
    }

    // ── Sort groups left→right by target X ──
    lgs.sort((a, b) => a.targetX - b.targetX);

    // ── Resolve overlaps (push right) ──
    const centers: number[] = [];
    for (let i = 0; i < lgs.length; i++) {
      let cx = lgs[i].targetX;
      if (i > 0) {
        const prevRight = centers[i - 1] + lgs[i - 1].width / 2;
        const myLeft = cx - lgs[i].width / 2;
        if (myLeft < prevRight + FAMILY_GAP) {
          cx = prevRight + FAMILY_GAP + lgs[i].width / 2;
        }
      }
      centers.push(cx);
    }

    // For the first generation, center everything at X=0
    if (gen === sortedGens[0] && centers.length > 0) {
      const left = centers[0] - lgs[0].width / 2;
      const right = centers[centers.length - 1] + lgs[lgs.length - 1].width / 2;
      const shift = -(left + right) / 2;
      for (let i = 0; i < centers.length; i++) centers[i] += shift;
    }

    // ── Emit positioned nodes ──
    for (let i = 0; i < lgs.length; i++) {
      const lg = lgs[i];
      for (let j = 0; j < lg.members.length; j++) {
        const id = lg.members[j];
        const x = centers[i] + lg.offsets[j];
        positionOf.set(id, { x, y });

        const person = personById.get(id);
        if (!person) continue;
        nodes.push({
          person,
          x,
          y,
          parentIds: [...(parentsOf.get(id) ?? [])],
          generation: generation.get(id) ?? 0,
        });
      }
    }
  }

  const familyGroups = buildFamilyGroups(nodes, positionOf, generation);

  // ── Step 6b: Stagger overlapping rails ─────────────────────────────
  staggerFamilyGroupRails(familyGroups);

  // ── Step 7: Generate partner connection lines ─────────────────────
  // Only for childless couples — couples with children already get a
  // colored ═ bond rendered via their familyGroup.

  const connections: GraphConnection[] = [];
  const processedPartnerPairs = new Set<string>();

  // Build a set of parent-pair keys that already have a family group
  const familyGroupPairKeys = new Set<string>();
  for (const group of familyGroups) {
    if (group.parentIds.length >= 2) {
      familyGroupPairKeys.add([...group.parentIds].sort().join('|'));
    }
  }

  for (const node of nodes) {
    const { x, y } = positionOf.get(node.person.id) ?? { x: 0, y: 0 };

    // Partner connections: horizontal line between partners (deduplicated)
    for (const partnerId of partnersOf.get(node.person.id) ?? []) {
      const pairKey = [node.person.id, partnerId].sort().join('|');
      if (processedPartnerPairs.has(pairKey)) continue;
      processedPartnerPairs.add(pairKey);

      // Skip if this couple already has a family group T-connector
      if (familyGroupPairKeys.has(pairKey)) continue;

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

  return { nodes, connections, familyGroups };
}
