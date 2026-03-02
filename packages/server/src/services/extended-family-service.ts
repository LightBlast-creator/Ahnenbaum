/**
 * Extended family derivation service.
 *
 * Dynamically computes extended relationships (grandparents, cousins, in-laws)
 * via graph traversal. None of these relationships are materialized in the DB.
 */

import { isNull } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { relationships } from '../db/schema/index.ts';
import { AUTO_PARTNER_QUALIFYING_TYPES } from './auto-relationships.ts';
import { PARENT_CHILD_TYPES, ok, type Result } from '@ahnenbaum/core';
import type { PersonWithDetailsRow } from './person-service.ts';
import { enrichPersonRowsMap } from './person-enrichment.ts';

// ── Interfaces ─────────────────────────────────────────────────────────

export interface ExtendedFamilyMember {
  person: PersonWithDetailsRow;
  derivedRelationship: string;
}

export interface ExtendedFamilyResult {
  grandparents: ExtendedFamilyMember[];
  greatGrandparents: ExtendedFamilyMember[];
  unclesAunts: ExtendedFamilyMember[];
  greatUnclesAunts: ExtendedFamilyMember[];
  cousins: ExtendedFamilyMember[];
  nephewsNieces: ExtendedFamilyMember[];
  siblingsInLaw: ExtendedFamilyMember[];
  parentsInLaw: ExtendedFamilyMember[];
  childrenInLaw: ExtendedFamilyMember[];
  coParentsInLaw: ExtendedFamilyMember[];
}

// ── Helpers ────────────────────────────────────────────────────────────

const QUALIFYING_PARENTS = new Set(AUTO_PARTNER_QUALIFYING_TYPES as readonly string[]);
const PARENT_TYPES = new Set(PARENT_CHILD_TYPES as readonly string[]);

function isBioOrLegalParent(type: string) {
  return QUALIFYING_PARENTS.has(type);
}

function isPartnerEdge(type: string) {
  return !PARENT_TYPES.has(type);
}

interface Edge {
  source: string;
  target: string;
  type: string;
  role: 'parent' | 'child' | 'partner';
}

// ── Graph Building ────────────────────────────────────────────────────

/**
 * Build the local family graph around a person via BFS.
 * Loads all non-deleted relationships once, then traverses in-memory.
 */
function buildFamilyGraph(db: BetterSQLite3Database, personId: string): Edge[] {
  // Load ALL non-deleted relationships once (not per BFS layer)
  const allRels = db
    .select({
      personAId: relationships.personAId,
      personBId: relationships.personBId,
      type: relationships.type,
    })
    .from(relationships)
    .where(isNull(relationships.deletedAt))
    .all();

  // Build adjacency index for fast lookup
  const byA = new Map<string, typeof allRels>();
  const byB = new Map<string, typeof allRels>();
  for (const rel of allRels) {
    const listA = byA.get(rel.personAId) ?? [];
    listA.push(rel);
    byA.set(rel.personAId, listA);

    const listB = byB.get(rel.personBId) ?? [];
    listB.push(rel);
    byB.set(rel.personBId, listB);
  }

  const edges: Edge[] = [];
  const visitedNodes = new Set<string>();
  let currentLayer = new Set<string>([personId]);
  const MAX_DEPTH = 5;

  for (let depth = 0; currentLayer.size > 0 && depth < MAX_DEPTH; depth++) {
    for (const node of currentLayer) {
      visitedNodes.add(node);
    }

    const nextLayer = new Set<string>();

    for (const nodeId of currentLayer) {
      // Relationships where this node is personA
      const asA = byA.get(nodeId) ?? [];
      for (const rel of asA) {
        edges.push({
          source: rel.personAId,
          target: rel.personBId,
          type: rel.type,
          role: isPartnerEdge(rel.type) ? 'partner' : 'child',
        });
        if (!visitedNodes.has(rel.personBId)) nextLayer.add(rel.personBId);
      }

      // Relationships where this node is personB
      const asB = byB.get(nodeId) ?? [];
      for (const rel of asB) {
        edges.push({
          source: rel.personBId,
          target: rel.personAId,
          type: rel.type,
          role: isPartnerEdge(rel.type) ? 'partner' : 'parent',
        });
        if (!visitedNodes.has(rel.personAId)) nextLayer.add(rel.personAId);
      }
    }

    currentLayer = nextLayer;
  }

  // Deduplicate edges
  const edgeKey = (e: Edge) => `${e.source}-${e.target}-${e.type}-${e.role}`;
  const uniqueEdges = new Map<string, Edge>();
  for (const edge of edges) {
    uniqueEdges.set(edgeKey(edge), edge);
  }
  return Array.from(uniqueEdges.values());
}

// ── Relationship Derivation ───────────────────────────────────────────

/**
 * Derive all extended family relationship ID sets from the edge graph.
 * Pure function — no database access.
 */
function deriveRelationships(graph: Edge[], personId: string): Record<string, string[]> {
  const getParents = (id: string) =>
    graph
      .filter((e) => e.source === id && e.role === 'parent' && isBioOrLegalParent(e.type))
      .map((e) => e.target);

  const getChildren = (id: string) =>
    graph
      .filter((e) => e.source === id && e.role === 'child' && isBioOrLegalParent(e.type))
      .map((e) => e.target);

  const getPartners = (id: string) =>
    graph.filter((e) => e.source === id && e.role === 'partner').map((e) => e.target);

  const getSiblings = (id: string) => {
    const p = getParents(id);
    const siblings = new Set<string>();
    for (const parent of p) {
      for (const child of getChildren(parent)) {
        if (child !== id) siblings.add(child);
      }
    }
    return Array.from(siblings);
  };

  // Helper for path chaining
  const walk = (startIds: string | string[], ...steps: ((id: string) => string[])[]) => {
    let current = Array.isArray(startIds) ? startIds : [startIds];
    for (const step of steps) {
      const next = new Set<string>();
      for (const id of current) {
        for (const target of step(id)) {
          next.add(target);
        }
      }
      current = Array.from(next);
    }
    return Array.from(new Set(current)).filter((id) => id !== personId);
  };

  const grandparents = walk(personId, getParents, getParents);
  const greatGrandparents = walk(grandparents, getParents);
  const unclesAunts = walk(personId, getParents, getSiblings);
  const greatUnclesAunts = walk(grandparents, getSiblings);
  const cousins = walk(personId, getParents, getSiblings, getChildren);
  const nephewsNieces = walk(personId, getSiblings, getChildren);

  // Siblings-in-law: Partners' Siblings OR Siblings' Partners
  const pSiblings = walk(personId, getPartners, getSiblings);
  const sPartners = walk(personId, getSiblings, getPartners);
  const siblingsInLaw = Array.from(new Set([...pSiblings, ...sPartners]));

  const parentsInLaw = walk(personId, getPartners, getParents);
  const childrenInLaw = walk(personId, getChildren, getPartners);
  const coParentsInLaw = walk(childrenInLaw, getParents).filter(
    (id) => id !== personId && !getPartners(personId).includes(id),
  );

  return {
    grandparents,
    greatGrandparents,
    unclesAunts,
    greatUnclesAunts,
    cousins,
    nephewsNieces,
    siblingsInLaw,
    parentsInLaw,
    childrenInLaw,
    coParentsInLaw,
  };
}

// ── Core Traversal Engine ──────────────────────────────────────────────

export function getExtendedFamily(
  db: BetterSQLite3Database,
  personId: string,
): Result<ExtendedFamilyResult> {
  // 1. Build the graph (one DB query for all relationships)
  const graph = buildFamilyGraph(db, personId);

  // 2. Derive all relationship categories (pure function)
  const derived = deriveRelationships(graph, personId);

  // 3. Collect all unique person IDs that need enrichment
  const allNeededIds = new Set<string>();
  for (const ids of Object.values(derived)) {
    for (const id of ids) allNeededIds.add(id);
  }

  if (allNeededIds.size === 0) {
    return ok({
      grandparents: [],
      greatGrandparents: [],
      unclesAunts: [],
      greatUnclesAunts: [],
      cousins: [],
      nephewsNieces: [],
      siblingsInLaw: [],
      parentsInLaw: [],
      childrenInLaw: [],
      coParentsInLaw: [],
    });
  }

  // 4. Bulk-enrich persons (shared helper — one query each for persons, names, events, media)
  const enrichedMap = enrichPersonRowsMap(db, Array.from(allNeededIds));

  // 5. Build final result payload
  const mapList = (ids: string[], relType: string): ExtendedFamilyMember[] =>
    ids
      .map((id) => enrichedMap.get(id))
      .filter((p): p is PersonWithDetailsRow => p !== undefined)
      .map((person) => ({ person, derivedRelationship: relType }));

  return ok({
    grandparents: mapList(derived.grandparents, 'grandparent'),
    greatGrandparents: mapList(derived.greatGrandparents, 'great_grandparent'),
    unclesAunts: mapList(derived.unclesAunts, 'uncle_aunt'),
    greatUnclesAunts: mapList(derived.greatUnclesAunts, 'great_uncle_aunt'),
    cousins: mapList(derived.cousins, 'cousin'),
    nephewsNieces: mapList(derived.nephewsNieces, 'nephew_niece'),
    siblingsInLaw: mapList(derived.siblingsInLaw, 'sibling_in_law'),
    parentsInLaw: mapList(derived.parentsInLaw, 'parent_in_law'),
    childrenInLaw: mapList(derived.childrenInLaw, 'child_in_law'),
    coParentsInLaw: mapList(derived.coParentsInLaw, 'co_parent_in_law'),
  });
}
