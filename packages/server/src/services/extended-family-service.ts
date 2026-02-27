/**
 * Extended family derivation service.
 *
 * Dynamically computes extended relationships (grandparents, cousins, in-laws)
 * via graph traversal. None of these relationships are materialized in the DB.
 */

import { inArray, isNull, and } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { relationships, persons, personNames, events } from '../db/schema/index';
import { AUTO_PARTNER_QUALIFYING_TYPES } from './auto-relationships';
import { PARENT_CHILD_TYPES, ok, type Result } from '@ahnenbaum/core';
import type { PersonWithDetailsRow } from './person-service';

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

// ── Core Traversal Engine ──────────────────────────────────────────────

export function getExtendedFamily(
  db: BetterSQLite3Database,
  personId: string,
): Result<ExtendedFamilyResult> {
  // 1. Fetch the neighborhood (iterative BFS up to 4 layers)
  const edges: Edge[] = [];
  const visitedNodes = new Set<string>();
  let currentLayer = new Set<string>([personId]);
  let depth = 0;
  const MAX_DEPTH = 5; // generous buffer for "great-grandparents -> siblings -> children"

  while (currentLayer.size > 0 && depth < MAX_DEPTH) {
    for (const node of currentLayer) {
      visitedNodes.add(node);
    }

    const nextLayer = new Set<string>();
    const nodeIds = Array.from(currentLayer);

    // Fetch all relationships involving current layer
    const layerRels = db
      .select({
        personAId: relationships.personAId,
        personBId: relationships.personBId,
        type: relationships.type,
      })
      .from(relationships)
      .where(isNull(relationships.deletedAt))
      .all() // SQLite is fast enough for all non-deleted, but let's filter in memory if small DB
      // Note: for production, a proper IN clause chunking is better, but typical Ahnenbaum DBs are < 10k rows
      .filter((r) => nodeIds.includes(r.personAId) || nodeIds.includes(r.personBId));

    for (const rel of layerRels) {
      const isAPresent = currentLayer.has(rel.personAId);
      const isBPresent = currentLayer.has(rel.personBId);

      // Add symmetric edges
      if (isAPresent) {
        edges.push({
          source: rel.personAId,
          target: rel.personBId,
          type: rel.type,
          role: isPartnerEdge(rel.type) ? 'partner' : 'child',
        });
        if (!visitedNodes.has(rel.personBId)) nextLayer.add(rel.personBId);
      }
      if (isBPresent) {
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
    depth++;
  }

  // Deduplicate edges just in case
  const edgeKey = (e: Edge) => `${e.source}-${e.target}-${e.type}-${e.role}`;
  const uniqueEdges = new Map<string, Edge>();
  for (const edge of edges) {
    uniqueEdges.set(edgeKey(edge), edge);
  }
  const graph = Array.from(uniqueEdges.values());

  // 2. Define traversal functions
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

  // Helper macro for path chaining
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
    // Final dedupe and exclude origin person
    return Array.from(new Set(current)).filter((id) => id !== personId);
  };

  // 3. Execute derivation rules
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
  ); // Exclude self and own partners

  // 4. Resolve full person details for the required IDs
  const allNeededIds = new Set([
    ...grandparents,
    ...greatGrandparents,
    ...unclesAunts,
    ...greatUnclesAunts,
    ...cousins,
    ...nephewsNieces,
    ...siblingsInLaw,
    ...parentsInLaw,
    ...childrenInLaw,
    ...coParentsInLaw,
  ]);

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

  const idsArray = Array.from(allNeededIds);

  // Bulk fetch persons
  const foundPersons = db
    .select()
    .from(persons)
    .where(inArray(persons.id, idsArray as [string, ...string[]]))
    .all();

  // Bulk fetch names and events for those persons
  const foundNames = db
    .select()
    .from(personNames)
    .where(inArray(personNames.personId, idsArray as [string, ...string[]]))
    .all();

  const foundEvents = db
    .select()
    .from(events)
    .where(
      and(isNull(events.deletedAt), inArray(events.personId, idsArray as [string, ...string[]])),
    )
    .all();

  const namesByPerson = new Map<string, typeof foundNames>();
  for (const name of foundNames) {
    const list = namesByPerson.get(name.personId) ?? [];
    list.push(name);
    namesByPerson.set(name.personId, list);
  }

  const eventsByPerson = new Map<string, typeof foundEvents>();
  for (const event of foundEvents) {
    const list = eventsByPerson.get(event.personId) ?? [];
    list.push(event);
    eventsByPerson.set(event.personId, list);
  }

  const enrichedMap = new Map<string, PersonWithDetailsRow>();
  for (const p of foundPersons) {
    enrichedMap.set(p.id, {
      id: p.id,
      sex: p.sex,
      notes: p.notes,
      privacy: p.privacy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      names: namesByPerson.get(p.id) ?? [],
      events: eventsByPerson.get(p.id) ?? [],
    });
  }

  // 5. Build final result payload
  const mapList = (ids: string[], relType: string): ExtendedFamilyMember[] =>
    ids
      .map((id) => enrichedMap.get(id))
      .filter((p): p is PersonWithDetailsRow => p !== undefined)
      .map((person) => ({ person, derivedRelationship: relType }));

  return ok({
    grandparents: mapList(grandparents, 'grandparent'),
    greatGrandparents: mapList(greatGrandparents, 'great_grandparent'),
    unclesAunts: mapList(unclesAunts, 'uncle_aunt'),
    greatUnclesAunts: mapList(greatUnclesAunts, 'great_uncle_aunt'),
    cousins: mapList(cousins, 'cousin'),
    nephewsNieces: mapList(nephewsNieces, 'nephew_niece'),
    siblingsInLaw: mapList(siblingsInLaw, 'sibling_in_law'),
    parentsInLaw: mapList(parentsInLaw, 'parent_in_law'),
    childrenInLaw: mapList(childrenInLaw, 'child_in_law'),
    coParentsInLaw: mapList(coParentsInLaw, 'co_parent_in_law'),
  });
}
