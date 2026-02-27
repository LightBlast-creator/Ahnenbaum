/**
 * Auto-relationship builder — creates partner relationships between co-parents.
 *
 * When a parent-child relationship is created and the child already has another
 * parent, this module auto-creates a `marriage` relationship between the parents
 * (if one doesn't already exist).
 *
 * Relies on `createRelationship()` for validation and duplicate detection.
 */

import { eq, and, isNull, inArray } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { createRelationship } from './relationship-service';
import { relationships } from '../db/schema/index';

// ── Configuration ────────────────────────────────────────────────────

/** Parent-child types that imply a partnership between co-parents. */
export const AUTO_PARTNER_QUALIFYING_TYPES = [
  'biological_parent',
  'adoptive_parent',
  'step_parent',
  'foster_parent',
] as const;

/** The default partner relationship type to auto-create. */
export const AUTO_PARTNER_DEFAULT_TYPE = 'marriage' as const;

// ── Core logic ───────────────────────────────────────────────────────

interface RelationshipLike {
  personAId: string;
  personBId: string;
  type: string;
}

interface RelationshipRow {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  placeId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Check if a newly created relationship should trigger auto-creation of
 * partner relationships between co-parents.
 *
 * @returns Array of auto-created relationship rows (empty if none created).
 */
export function maybeCreatePartnerRelationships(
  db: BetterSQLite3Database,
  newRelationship: RelationshipLike,
): RelationshipRow[] {
  // Only trigger for qualifying parent-child types
  if (!(AUTO_PARTNER_QUALIFYING_TYPES as readonly string[]).includes(newRelationship.type)) {
    return [];
  }

  // Convention: personA = parent, personB = child
  const childId = newRelationship.personBId;
  const newParentId = newRelationship.personAId;

  // Find all other parents of the same child (qualifying types only)
  const otherParentRels = db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.personBId, childId),
        isNull(relationships.deletedAt),
        inArray(
          relationships.type,
          AUTO_PARTNER_QUALIFYING_TYPES as unknown as [
            typeof relationships.$inferInsert.type,
            ...(typeof relationships.$inferInsert.type)[],
          ],
        ),
      ),
    )
    .all()
    .filter((r) => r.personAId !== newParentId);

  if (otherParentRels.length === 0) {
    return [];
  }

  // Deduplicate parent IDs (a parent may appear in multiple relationship types)
  const otherParentIds = [...new Set(otherParentRels.map((r) => r.personAId))];

  const autoCreated: RelationshipRow[] = [];

  for (const otherParentId of otherParentIds) {
    const result = createRelationship(db, {
      personAId: newParentId,
      personBId: otherParentId,
      type: AUTO_PARTNER_DEFAULT_TYPE,
    });

    // Silently skip conflicts (partner relationship already exists)
    if (result.ok) {
      autoCreated.push(result.data);
    }
  }

  return autoCreated;
}
