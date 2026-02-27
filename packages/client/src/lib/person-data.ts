/**
 * Person data loaders — extracted from person detail page.
 *
 * Centralizes all data-fetching for a single person view:
 * person details, events, relationships, siblings, and extended family.
 */

import {
  api,
  toPersonWithDetails,
  type PersonWithDetails,
  type ServerPersonResponse,
  type RelationshipRow,
  type RelationshipEntry,
} from '$lib/api';
import type { Event } from '@ahnenbaum/core';
import type { GenealogyDate } from '@ahnenbaum/core';
import { PARENT_CHILD_TYPES } from '@ahnenbaum/core';

// ── Types ───────────────────────────────────────────────────────────

export type ExtendedFamilyGroup = { person: PersonWithDetails; derivedRelationship: string }[];
export type ExtendedFamilyData = Record<string, ExtendedFamilyGroup>;

// ── Helpers ─────────────────────────────────────────────────────────

const PARENT_CHILD_SET = new Set(PARENT_CHILD_TYPES);

export function deriveRole(
  type: string,
  rel: { personAId: string; personBId: string },
  currentPersonId: string,
): 'parent' | 'child' | 'partner' {
  if (PARENT_CHILD_SET.has(type as Parameters<typeof PARENT_CHILD_SET.has>[0])) {
    // Convention: personA = parent, personB = child
    return rel.personBId === currentPersonId ? 'parent' : 'child';
  }
  return 'partner';
}

// ── Loaders ─────────────────────────────────────────────────────────

export async function loadPerson(
  personId: string,
): Promise<{ person: PersonWithDetails; events: Event[] } | null> {
  if (!personId) return null;
  try {
    const raw = await api.get<ServerPersonResponse>(`persons/${personId}`);
    const person = toPersonWithDetails(raw);
    const events: Event[] = (raw.events ?? [])
      .filter((e) => !e.deletedAt)
      .map((e) => ({
        id: e.id,
        type: e.type as Event['type'],
        date: e.date ? (JSON.parse(e.date) as GenealogyDate) : undefined,
        placeId: e.placeId ?? undefined,
        personId: e.personId ?? undefined,
        relationshipId: e.relationshipId ?? undefined,
        description: e.description ?? undefined,
        notes: e.notes ?? undefined,
        citationId: e.citationId ?? undefined,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        deletedAt: e.deletedAt ?? undefined,
      }));
    return { person, events };
  } catch {
    return null;
  }
}

export async function loadRelationships(personId: string): Promise<RelationshipEntry[]> {
  if (!personId) return [];
  try {
    const grouped = await api.get<Record<string, RelationshipRow[]>>(
      `relationships/person/${personId}`,
    );
    const entries: RelationshipEntry[] = [];
    for (const [type, rels] of Object.entries(grouped)) {
      for (const rel of rels) {
        const relatedId = rel.personAId === personId ? rel.personBId : rel.personAId;
        try {
          const relatedRaw = await api.get<ServerPersonResponse>(`persons/${relatedId}`);
          const relatedPerson = toPersonWithDetails(relatedRaw);
          entries.push({
            relationship: rel,
            relatedPerson,
            role: deriveRole(type, rel, personId),
          });
        } catch {
          // Skip unresolvable persons
        }
      }
    }
    return entries;
  } catch {
    return [];
  }
}

export async function loadSiblings(personId: string): Promise<PersonWithDetails[]> {
  if (!personId) return [];
  try {
    const siblingIds = await api.get<string[]>(`relationships/person/${personId}/siblings`);
    const resolved: PersonWithDetails[] = [];
    for (const id of siblingIds) {
      try {
        const raw = await api.get<ServerPersonResponse>(`persons/${id}`);
        resolved.push(toPersonWithDetails(raw));
      } catch {
        // Skip unresolvable persons
      }
    }
    return resolved;
  } catch {
    return [];
  }
}

export async function loadExtendedFamily(personId: string): Promise<ExtendedFamilyData | null> {
  if (!personId) return null;
  try {
    const raw = await api.get<
      Record<
        string,
        { person: Parameters<typeof toPersonWithDetails>[0]; derivedRelationship: string }[]
      >
    >(`relationships/person/${personId}/extended`);
    const transformed: ExtendedFamilyData = {};
    for (const [key, members] of Object.entries(raw)) {
      transformed[key] = members.map((member) => ({
        ...member,
        person: toPersonWithDetails(member.person),
      }));
    }
    return transformed;
  } catch {
    return null;
  }
}
