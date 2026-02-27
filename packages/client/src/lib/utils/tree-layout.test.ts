import { describe, expect, it } from 'vitest';
import { layoutAncestorTree, getTreeBounds, type TreeData } from './tree-layout';
import type { PersonWithDetails } from '$lib/api';

function makePerson(id: string, given: string, surname: string): PersonWithDetails {
  return {
    id,
    sex: 'male',
    privacy: 'public',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    preferredName: {
      id: `n-${id}`,
      personId: id,
      given,
      surname,
      type: 'birth',
      isPreferred: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    },
    allNames: [],
  };
}

describe('layoutAncestorTree', () => {
  it('returns empty array for undefined input', () => {
    expect(layoutAncestorTree(undefined)).toEqual([]);
  });

  it('positions root-only tree at origin', () => {
    const tree: TreeData = {
      person: makePerson('root', 'Max', 'Müller'),
      parents: [],
    };

    const nodes = layoutAncestorTree(tree);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(nodes[0].person.id).toBe('root');
  });

  it('positions 2-generation tree (root + 2 parents)', () => {
    const tree: TreeData = {
      person: makePerson('child', 'Max', 'Müller'),
      parents: [
        { person: makePerson('father', 'Klaus', 'Müller'), parents: [] },
        { person: makePerson('mother', 'Ingrid', 'Fischer'), parents: [] },
      ],
    };

    const nodes = layoutAncestorTree(tree);
    expect(nodes).toHaveLength(3);

    const root = nodes.find((n) => n.person.id === 'child');
    const father = nodes.find((n) => n.person.id === 'father');
    const mother = nodes.find((n) => n.person.id === 'mother');

    // Root at y=0, parents above (negative y)
    expect(root?.y).toBe(0);
    expect(father?.y).toBeLessThan(0);
    expect(mother?.y).toBeLessThan(0);

    // Father and mother at same y level
    expect(father?.y).toBe(mother?.y);

    // Father left, mother right (or vice versa)
    expect(father?.x).not.toBe(mother?.x);
  });

  it('handles single parent gracefully', () => {
    const tree: TreeData = {
      person: makePerson('child', 'Max', 'Müller'),
      parents: [{ person: makePerson('mother', 'Ingrid', 'Fischer'), parents: [] }],
    };

    const nodes = layoutAncestorTree(tree);
    expect(nodes).toHaveLength(2);
  });

  it('lays out 3 generations correctly', () => {
    const tree: TreeData = {
      person: makePerson('grandchild', 'Max', 'Müller'),
      parents: [
        {
          person: makePerson('father', 'Klaus', 'Müller'),
          parents: [
            { person: makePerson('grandfather', 'Hans', 'Müller'), parents: [] },
            { person: makePerson('grandmother', 'Maria', 'Schmidt'), parents: [] },
          ],
        },
        {
          person: makePerson('mother', 'Ingrid', 'Fischer'),
          parents: [],
        },
      ],
    };

    const nodes = layoutAncestorTree(tree);
    expect(nodes).toHaveLength(5);

    const gp = nodes.find((n) => n.person.id === 'grandfather');
    const gm = nodes.find((n) => n.person.id === 'grandmother');

    // Grandparents should be at depth 2 (most negative y)
    const root = nodes.find((n) => n.person.id === 'grandchild');
    expect(gp).toBeDefined();
    expect(gm).toBeDefined();
    expect(root).toBeDefined();
    expect(gp?.y).toBeLessThan(root?.y ?? 0);
    expect(gm?.y).toBeLessThan(root?.y ?? 0);
  });
});

describe('getTreeBounds', () => {
  it('returns zero bounds for empty array', () => {
    const bounds = getTreeBounds([]);
    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });

  it('computes correct bounds', () => {
    const nodes = [
      { person: makePerson('a', 'A', 'B'), x: -100, y: -200, parentIds: [] },
      { person: makePerson('b', 'C', 'D'), x: 100, y: 0, parentIds: [] },
    ];

    const bounds = getTreeBounds(nodes);
    expect(bounds.minX).toBe(-100);
    expect(bounds.maxX).toBe(100);
    expect(bounds.minY).toBe(-200);
    expect(bounds.maxY).toBe(0);
    expect(bounds.width).toBe(200);
    expect(bounds.height).toBe(200);
  });
});
