/**
 * Place service integration tests.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as placeService from './place-service';

function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle({ client: sqlite });
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('placeService', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it('creates a place', () => {
    const result = placeService.createPlace(db, { name: 'Munich' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe('Munich');
  });

  it('validates name is required', () => {
    const result = placeService.createPlace(db, { name: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates hierarchical places', () => {
    const germany = placeService.createPlace(db, { name: 'Germany' });
    if (!germany.ok) throw new Error('setup');

    const bavaria = placeService.createPlace(db, {
      name: 'Bavaria',
      parentId: germany.data.id,
    });
    if (!bavaria.ok) throw new Error('setup');

    const munich = placeService.createPlace(db, {
      name: 'Munich',
      parentId: bavaria.data.id,
    });
    if (!munich.ok) throw new Error('setup');

    const result = placeService.getPlaceById(db, munich.data.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.ancestors).toHaveLength(2);
    expect(result.data.ancestors[0].name).toBe('Bavaria');
    expect(result.data.ancestors[1].name).toBe('Germany');
  });

  it('returns children in getPlaceById', () => {
    const parent = placeService.createPlace(db, { name: 'Germany' });
    if (!parent.ok) throw new Error('setup');

    placeService.createPlace(db, { name: 'Bavaria', parentId: parent.data.id });
    placeService.createPlace(db, { name: 'Saxony', parentId: parent.data.id });

    const result = placeService.getPlaceById(db, parent.data.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.children).toHaveLength(2);
  });

  it('stores and retrieves coordinates', () => {
    const result = placeService.createPlace(db, {
      name: 'Munich',
      latitude: 48.1351,
      longitude: 11.582,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.latitude).toBeCloseTo(48.1351, 4);
    expect(result.data.longitude).toBeCloseTo(11.582, 3);
  });

  it('de-duplicates places via findOrCreatePlace', () => {
    const first = placeService.findOrCreatePlace(db, 'Munich');
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error('setup');

    const second = placeService.findOrCreatePlace(db, 'Munich');
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error('setup');

    expect(second.data.id).toBe(first.data.id);
  });

  it('soft-deletes a place', () => {
    const created = placeService.createPlace(db, { name: 'ToDelete' });
    if (!created.ok) throw new Error('setup');

    const del = placeService.deletePlace(db, created.data.id);
    expect(del.ok).toBe(true);

    const find = placeService.getPlaceById(db, created.data.id);
    expect(find.ok).toBe(false);
  });

  it('lists places with search', () => {
    placeService.createPlace(db, { name: 'Munich' });
    placeService.createPlace(db, { name: 'Berlin' });
    placeService.createPlace(db, { name: 'Munich-Pasing' });

    const result = placeService.listPlaces(db, { search: 'Munich' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.total).toBe(2);
  });
});
