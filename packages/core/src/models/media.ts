/**
 * Media types — photos, documents, video, and audio.
 *
 * Media files can be linked to multiple entities (persons, events,
 * relationships, sources) via the MediaLink join table.
 */

/** Supported media types. */
export type MediaType = 'image' | 'pdf' | 'video' | 'audio';

/**
 * Media — a stored file (photo, document, video, audio).
 */
export interface Media {
  readonly id: string;
  readonly type: MediaType;
  /** Storage filename (UUID-based, no user data). */
  readonly filename: string;
  /** Original upload filename. */
  readonly originalFilename: string;
  readonly mimeType: string;
  /** File size in bytes. */
  readonly size: number;
  readonly caption?: string;
  /** Date the media depicts (not upload date). */
  readonly date?: string;
  readonly placeId?: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

/** Entity types that media can be linked to. */
export type MediaLinkEntityType = 'person' | 'event' | 'relationship' | 'source';

/**
 * MediaLink — polymorphic join between media and other entities.
 *
 * `linkedEntityType` + `linkedEntityId` together identify the target.
 */
export interface MediaLink {
  readonly id: string;
  readonly mediaId: string;
  readonly linkedEntityType: MediaLinkEntityType;
  /** UUID of the linked entity (person, event, relationship, or source). */
  readonly linkedEntityId: string;
  /** Ordering within a gallery. */
  readonly sortOrder?: number;
  /** Per-link caption override (distinct from the media's own caption). */
  readonly caption?: string;
  /** Marks the primary photo for a person. */
  readonly isPrimary?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Metadata extracted from media EXIF data.
 */
export interface MediaMetadata {
  readonly dateTaken?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly cameraModel?: string;
  readonly orientation?: number;
}
