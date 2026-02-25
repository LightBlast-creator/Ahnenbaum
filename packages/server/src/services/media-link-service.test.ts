/**
 * Media link service integration tests.
 *
 * Uses an in-memory SQLite database with schema applied via migrate().
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as mediaLinkService from './media-link-service';
import * as personService from './person-service';
import { media } from '../db/schema/index';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

/** Insert a minimal media record directly for testing. */
function insertTestMedia(db: BetterSQLite3Database, id: string = crypto.randomUUID()): string {
  const timestamp = new Date().toISOString();
  db.insert(media)
    .values({
      id,
      type: 'image',
      filename: 'test.jpg',
      originalFilename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1000,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();
  return id;
}

/** Create a person and return their ID. */
function createTestPerson(db: BetterSQLite3Database): string {
  const result = personService.createPerson(db, {
    names: [{ given: 'Test', surname: 'Person' }],
  });
  if (!result.ok) throw new Error('Failed to create test person');
  return result.data.id;
}

describe('mediaLinkService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  // ── createMediaLink ───────────────────────────────────────────────

  it('creates a link between media and a person', () => {
    const mediaId = insertTestMedia(db);
    const personId = createTestPerson(db);

    const result = mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: personId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mediaId).toBe(mediaId);
    expect(result.data.linkedEntityType).toBe('person');
    expect(result.data.linkedEntityId).toBe(personId);
  });

  it('rejects link to non-existent media', () => {
    const personId = createTestPerson(db);
    const result = mediaLinkService.createMediaLink(db, {
      mediaId: 'fake-media',
      entityType: 'person',
      entityId: personId,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.code).toBe('MEDIA_LINK_MEDIA_NOT_FOUND');
  });

  it('rejects link to non-existent entity', () => {
    const mediaId = insertTestMedia(db);
    const result = mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: 'fake-person',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.details?.code).toBe('MEDIA_LINK_ENTITY_NOT_FOUND');
  });

  it('rejects duplicate links', () => {
    const mediaId = insertTestMedia(db);
    const personId = createTestPerson(db);

    mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: personId,
    });

    const duplicate = mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: personId,
    });

    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) return;
    expect(duplicate.error.code).toBe('CONFLICT');
  });

  // ── deleteMediaLink ───────────────────────────────────────────────

  it('deletes a media link', () => {
    const mediaId = insertTestMedia(db);
    const personId = createTestPerson(db);

    const created = mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: personId,
    });
    if (!created.ok) throw new Error('setup failed');

    const del = mediaLinkService.deleteMediaLink(db, created.data.id);
    expect(del.ok).toBe(true);

    // Link should be gone
    const links = mediaLinkService.getMediaForEntity(db, 'person', personId);
    expect(links.ok).toBe(true);
    if (!links.ok) return;
    expect(links.data).toHaveLength(0);
  });

  // ── Primary photo logic ───────────────────────────────────────────

  it('sets and toggles primary photo for a person', () => {
    const mediaId1 = insertTestMedia(db);
    const mediaId2 = insertTestMedia(db);
    const personId = createTestPerson(db);

    // Set first as primary
    const link1 = mediaLinkService.createMediaLink(db, {
      mediaId: mediaId1,
      entityType: 'person',
      entityId: personId,
      isPrimary: true,
    });
    expect(link1.ok).toBe(true);
    if (!link1.ok) return;
    expect(link1.data.isPrimary).toBe(true);

    // Set second as primary — first should be unset
    const link2 = mediaLinkService.createMediaLink(db, {
      mediaId: mediaId2,
      entityType: 'person',
      entityId: personId,
      isPrimary: true,
    });
    expect(link2.ok).toBe(true);
    if (!link2.ok) return;
    expect(link2.data.isPrimary).toBe(true);

    // Check that first is no longer primary
    const allMedia = mediaLinkService.getMediaForEntity(db, 'person', personId);
    expect(allMedia.ok).toBe(true);
    if (!allMedia.ok) return;
    const primaries = allMedia.data.filter((m) => m.link.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].link.mediaId).toBe(mediaId2);
  });

  // ── getMediaForEntity ─────────────────────────────────────────────

  it('returns media ordered by sort_order', () => {
    const mediaId1 = insertTestMedia(db);
    const mediaId2 = insertTestMedia(db);
    const mediaId3 = insertTestMedia(db);
    const personId = createTestPerson(db);

    mediaLinkService.createMediaLink(db, {
      mediaId: mediaId1,
      entityType: 'person',
      entityId: personId,
      sortOrder: 3,
    });
    mediaLinkService.createMediaLink(db, {
      mediaId: mediaId2,
      entityType: 'person',
      entityId: personId,
      sortOrder: 1,
    });
    mediaLinkService.createMediaLink(db, {
      mediaId: mediaId3,
      entityType: 'person',
      entityId: personId,
      sortOrder: 2,
    });

    const result = mediaLinkService.getMediaForEntity(db, 'person', personId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(3);
    expect(result.data[0].link.sortOrder).toBe(1);
    expect(result.data[1].link.sortOrder).toBe(2);
    expect(result.data[2].link.sortOrder).toBe(3);
  });

  // ── getLinksForMedia ──────────────────────────────────────────────

  it('returns all entities linked to a media item', () => {
    const mediaId = insertTestMedia(db);
    const person1 = createTestPerson(db);
    const person2 = createTestPerson(db);

    mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: person1,
    });
    mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: person2,
    });

    const result = mediaLinkService.getLinksForMedia(db, mediaId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
  });

  // ── updateMediaLink ───────────────────────────────────────────────

  it('updates sort order and caption', () => {
    const mediaId = insertTestMedia(db);
    const personId = createTestPerson(db);

    const created = mediaLinkService.createMediaLink(db, {
      mediaId,
      entityType: 'person',
      entityId: personId,
    });
    if (!created.ok) throw new Error('setup failed');

    const updated = mediaLinkService.updateMediaLink(db, created.data.id, {
      sortOrder: 5,
      caption: 'Wedding photo',
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.sortOrder).toBe(5);
    expect(updated.data.caption).toBe('Wedding photo');
  });
});
