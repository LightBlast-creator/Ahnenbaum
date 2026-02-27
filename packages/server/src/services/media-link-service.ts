/**
 * Media link service — business logic for linking media to entities.
 *
 * All methods return Result<T> — no thrown exceptions.
 * Handles link creation, deletion, reordering, and primary photo logic.
 */

import { eq, and, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ok, err, type Result } from '@ahnenbaum/core';
import type { MediaLinkEntityType } from '@ahnenbaum/core';
import { media, mediaLinks } from '../db/schema/index';
import { persons } from '../db/schema/index';
import { events } from '../db/schema/index';
import { relationships } from '../db/schema/index';
import { sources } from '../db/schema/index';
import { mustGet } from '../db/db-helpers';
import { now, uuid } from '../db/helpers';

// ── Types ────────────────────────────────────────────────────────────

export interface CreateMediaLinkInput {
  mediaId: string;
  entityType: MediaLinkEntityType;
  entityId: string;
  sortOrder?: number;
  caption?: string;
  isPrimary?: boolean;
}

export interface UpdateMediaLinkInput {
  sortOrder?: number;
  caption?: string;
  isPrimary?: boolean;
}

/**
 * Validate that a target entity exists and is not soft-deleted.
 */
function entityExists(
  db: BetterSQLite3Database,
  entityType: MediaLinkEntityType,
  entityId: string,
): boolean {
  switch (entityType) {
    case 'person': {
      const row = db.select().from(persons).where(eq(persons.id, entityId)).get();
      return !!row && !row.deletedAt;
    }
    case 'event': {
      const row = db.select().from(events).where(eq(events.id, entityId)).get();
      return !!row && !row.deletedAt;
    }
    case 'relationship': {
      const row = db.select().from(relationships).where(eq(relationships.id, entityId)).get();
      return !!row && !row.deletedAt;
    }
    case 'source': {
      const row = db.select().from(sources).where(eq(sources.id, entityId)).get();
      return !!row && !row.deletedAt;
    }
    default:
      return false;
  }
}

// ── Service methods ──────────────────────────────────────────────────

/**
 * Create a link between a media item and an entity.
 */
export function createMediaLink(
  db: BetterSQLite3Database,
  input: CreateMediaLinkInput,
): Result<typeof mediaLinks.$inferSelect> {
  // Verify media exists
  const mediaRow = db.select().from(media).where(eq(media.id, input.mediaId)).get();
  if (!mediaRow || mediaRow.deletedAt) {
    return err('NOT_FOUND', `Media with id '${input.mediaId}' not found`, {
      code: 'MEDIA_LINK_MEDIA_NOT_FOUND',
    });
  }

  // Verify entity exists
  if (!entityExists(db, input.entityType, input.entityId)) {
    return err('NOT_FOUND', `Entity '${input.entityType}' with id '${input.entityId}' not found`, {
      code: 'MEDIA_LINK_ENTITY_NOT_FOUND',
    });
  }

  // Check for duplicate link
  const existing = db
    .select()
    .from(mediaLinks)
    .where(
      and(
        eq(mediaLinks.mediaId, input.mediaId),
        eq(mediaLinks.linkedEntityType, input.entityType),
        eq(mediaLinks.linkedEntityId, input.entityId),
      ),
    )
    .get();
  if (existing) {
    return err('CONFLICT', 'This media is already linked to this entity', {
      code: 'MEDIA_LINK_ALREADY_EXISTS',
    });
  }

  const timestamp = now();
  const linkId = uuid();

  // If setting as primary, unset existing primary first
  if (input.isPrimary && input.entityType === 'person') {
    unsetPrimaryForPerson(db, input.entityId);
  }

  db.insert(mediaLinks)
    .values({
      id: linkId,
      mediaId: input.mediaId,
      linkedEntityType: input.entityType,
      linkedEntityId: input.entityId,
      sortOrder: input.sortOrder ?? null,
      caption: input.caption ?? null,
      isPrimary: input.isPrimary ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return ok(mustGet(db.select().from(mediaLinks).where(eq(mediaLinks.id, linkId)).get()));
}

/**
 * Delete a media link (not the media file itself).
 */
export function deleteMediaLink(db: BetterSQLite3Database, linkId: string): Result<void> {
  const existing = db.select().from(mediaLinks).where(eq(mediaLinks.id, linkId)).get();
  if (!existing) {
    return err('NOT_FOUND', `Media link with id '${linkId}' not found`);
  }

  db.delete(mediaLinks).where(eq(mediaLinks.id, linkId)).run();
  return ok(undefined);
}

/**
 * Update a media link's sort order, caption, or primary status.
 */
export function updateMediaLink(
  db: BetterSQLite3Database,
  linkId: string,
  input: UpdateMediaLinkInput,
): Result<typeof mediaLinks.$inferSelect> {
  const existing = db.select().from(mediaLinks).where(eq(mediaLinks.id, linkId)).get();
  if (!existing) {
    return err('NOT_FOUND', `Media link with id '${linkId}' not found`);
  }

  // If setting as primary, unset existing primary first
  if (input.isPrimary && existing.linkedEntityType === 'person') {
    unsetPrimaryForPerson(db, existing.linkedEntityId);
  }

  db.update(mediaLinks)
    .set({
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.caption !== undefined && { caption: input.caption }),
      ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
      updatedAt: now(),
    })
    .where(eq(mediaLinks.id, linkId))
    .run();

  return ok(mustGet(db.select().from(mediaLinks).where(eq(mediaLinks.id, linkId)).get()));
}

/**
 * Get all media linked to an entity, ordered by sort_order.
 */
export function getMediaForEntity(
  db: BetterSQLite3Database,
  entityType: MediaLinkEntityType,
  entityId: string,
): Result<{ link: typeof mediaLinks.$inferSelect; media: typeof media.$inferSelect }[]> {
  const links = db
    .select()
    .from(mediaLinks)
    .innerJoin(media, eq(mediaLinks.mediaId, media.id))
    .where(
      and(
        eq(mediaLinks.linkedEntityType, entityType),
        eq(mediaLinks.linkedEntityId, entityId),
        sql`${media.deletedAt} IS NULL`,
      ),
    )
    .orderBy(mediaLinks.sortOrder)
    .all();

  return ok(
    links.map((row) => ({
      link: row.media_links,
      media: row.media,
    })),
  );
}

/**
 * Get all entities linked to a media item (inverse lookup).
 */
export function getLinksForMedia(
  db: BetterSQLite3Database,
  mediaId: string,
): Result<(typeof mediaLinks.$inferSelect)[]> {
  const mediaRow = db.select().from(media).where(eq(media.id, mediaId)).get();
  if (!mediaRow || mediaRow.deletedAt) {
    return err('NOT_FOUND', `Media with id '${mediaId}' not found`);
  }

  const links = db.select().from(mediaLinks).where(eq(mediaLinks.mediaId, mediaId)).all();

  return ok(links);
}

// ── Internal helpers ─────────────────────────────────────────────────

function unsetPrimaryForPerson(db: BetterSQLite3Database, personId: string): void {
  db.update(mediaLinks)
    .set({ isPrimary: false, updatedAt: now() })
    .where(
      and(
        eq(mediaLinks.linkedEntityType, 'person'),
        eq(mediaLinks.linkedEntityId, personId),
        eq(mediaLinks.isPrimary, true),
      ),
    )
    .run();
}
