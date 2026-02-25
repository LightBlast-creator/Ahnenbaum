/**
 * Place — hierarchical location model.
 *
 * Places use a self-referencing parent_id to build hierarchies:
 *   "Munich" (city) → "Bavaria" (state) → "Germany" (country)
 *
 * Optional lat/lng coordinates support future map visualisation
 * and EXIF-based photo location matching.
 */

export interface Place {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  /** Latitude in decimal degrees. */
  readonly latitude?: number;
  /** Longitude in decimal degrees. */
  readonly longitude?: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}
