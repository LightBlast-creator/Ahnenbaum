/**
 * Family graph layout unit tests.
 */

import { describe, expect, it } from 'vitest';
import { layoutFamilyGraph, type GraphEdge } from './family-graph-layout';
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

describe('layoutFamilyGraph', () => {
  it('returns empty layout for empty input', () => {
    const result = layoutFamilyGraph([], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.connections).toHaveLength(0);
  });

  it('positions a single person', () => {
    const persons = [makePerson('p1', 'Max', 'Müller')];
    const result = layoutFamilyGraph(persons, []);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].person.id).toBe('p1');
  });

  it('positions parent-child with correct generation order', () => {
    const persons = [makePerson('parent', 'Klaus', 'Müller'), makePerson('child', 'Max', 'Müller')];
    // Use actual PARENT_CHILD_TYPES value
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'parent', personBId: 'child', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.nodes).toHaveLength(2);

    const parentNode = result.nodes.find((n) => n.person.id === 'parent');
    const childNode = result.nodes.find((n) => n.person.id === 'child');

    expect(parentNode).toBeDefined();
    expect(childNode).toBeDefined();
    // Parent at gen 0, child at gen 1 → parent y < child y
    if (!parentNode || !childNode) throw new Error('Expected nodes');
    expect(parentNode.y).toBeLessThan(childNode.y);
  });

  it('creates connections for parent-child edges', () => {
    const persons = [makePerson('parent', 'Klaus', 'Müller'), makePerson('child', 'Max', 'Müller')];
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'parent', personBId: 'child', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.connections.length).toBeGreaterThanOrEqual(1);
    // The output connection type is 'parent-child' (not the input edge type)
    expect(result.connections.some((c) => c.type === 'parent-child')).toBe(true);
  });

  it('handles partner edges', () => {
    const persons = [
      makePerson('husband', 'Klaus', 'Müller'),
      makePerson('wife', 'Ingrid', 'Fischer'),
    ];
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'husband', personBId: 'wife', type: 'marriage' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.nodes).toHaveLength(2);

    const h = result.nodes.find((n) => n.person.id === 'husband');
    const w = result.nodes.find((n) => n.person.id === 'wife');

    // Partners should be on the same generation (same y)
    if (!h || !w) throw new Error('Expected nodes');
    expect(h.y).toBe(w.y);
    // But different x
    expect(h.x).not.toBe(w.x);
  });

  it('handles multi-generation family', () => {
    const persons = [
      makePerson('grandparent', 'Hans', 'Müller'),
      makePerson('parent', 'Klaus', 'Müller'),
      makePerson('child', 'Max', 'Müller'),
    ];
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'grandparent', personBId: 'parent', type: 'biological_parent' },
      { id: 'r2', personAId: 'parent', personBId: 'child', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.nodes).toHaveLength(3);

    const gp = result.nodes.find((n) => n.person.id === 'grandparent');
    const p = result.nodes.find((n) => n.person.id === 'parent');
    const c = result.nodes.find((n) => n.person.id === 'child');

    // Correct top-to-bottom ordering
    if (!gp || !p || !c) throw new Error('Expected nodes');
    expect(gp.y).toBeLessThan(p.y);
    expect(p.y).toBeLessThan(c.y);
  });

  it('produces partner connection for marriage edge', () => {
    const persons = [makePerson('a', 'A', 'X'), makePerson('b', 'B', 'Y')];
    const edges: GraphEdge[] = [{ id: 'r1', personAId: 'a', personBId: 'b', type: 'marriage' }];
    const result = layoutFamilyGraph(persons, edges);
    expect(result.connections.some((c) => c.type === 'partner')).toBe(true);
  });

  it('handles disconnected persons (no edges)', () => {
    const persons = [makePerson('lone1', 'Lone', 'Wolf'), makePerson('lone2', 'Solo', 'Star')];

    const result = layoutFamilyGraph(persons, []);
    // Both assigned to gen 0, same y
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].y).toBe(result.nodes[1].y);
  });

  it('ignores edges referencing non-existent persons', () => {
    const persons = [makePerson('p1', 'A', 'B')];
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'p1', personBId: 'ghost', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.nodes).toHaveLength(1);
    expect(result.connections).toHaveLength(0);
  });

  it('aligns generations when two branches merge via partner pull', () => {
    // Friedrich & Berta → parents of Ernst
    // Ernst married Helene
    // Lieselotte & Helmut → parents of Barbara
    // Barbara married Martin (child of Ernst & Helene)
    // Expected: Friedrich/Berta at gen 0, Lieselotte/Helmut + Ernst/Helene at gen 1, Martin/Barbara at gen 2
    const persons = [
      makePerson('friedrich', 'Friedrich', 'Probst'),
      makePerson('berta', 'Berta', 'Pfeiffer'),
      makePerson('ernst', 'Ernst', 'Probst'),
      makePerson('helene', 'Helene', 'Probst'),
      makePerson('lieselotte', 'Lieselotte', 'Brekle'),
      makePerson('helmut', 'Helmut', 'Brekle'),
      makePerson('martin', 'Martin', 'Probst'),
      makePerson('barbara', 'Barbara', 'Probst'),
    ];
    const edges: GraphEdge[] = [
      // Friedrich & Berta are parents of Ernst
      { id: 'r1', personAId: 'friedrich', personBId: 'ernst', type: 'biological_parent' },
      { id: 'r2', personAId: 'berta', personBId: 'ernst', type: 'biological_parent' },
      // Ernst & Helene are married
      { id: 'r3', personAId: 'helene', personBId: 'ernst', type: 'marriage' },
      // Ernst & Helene are parents of Martin
      { id: 'r4', personAId: 'ernst', personBId: 'martin', type: 'biological_parent' },
      { id: 'r5', personAId: 'helene', personBId: 'martin', type: 'biological_parent' },
      // Lieselotte & Helmut are married
      { id: 'r6', personAId: 'helmut', personBId: 'lieselotte', type: 'marriage' },
      // Lieselotte & Helmut are parents of Barbara
      { id: 'r7', personAId: 'lieselotte', personBId: 'barbara', type: 'biological_parent' },
      { id: 'r8', personAId: 'helmut', personBId: 'barbara', type: 'biological_parent' },
      // Martin & Barbara are married
      { id: 'r9', personAId: 'barbara', personBId: 'martin', type: 'marriage' },
    ];

    const result = layoutFamilyGraph(persons, edges);

    const gen = (id: string) => {
      const node = result.nodes.find((n) => n.person.id === id);
      if (!node) throw new Error(`Node not found: ${id}`);
      return node.y;
    };

    // Friedrich & Berta should be at the top (gen 0)
    expect(gen('friedrich')).toBe(gen('berta'));

    // Lieselotte & Helmut should be one generation below Friedrich
    expect(gen('lieselotte')).toBe(gen('helmut'));
    expect(gen('lieselotte')).toBeGreaterThan(gen('friedrich'));

    // Ernst & Helene should be at the same level as Lieselotte & Helmut
    expect(gen('ernst')).toBe(gen('helene'));
    expect(gen('ernst')).toBe(gen('lieselotte'));

    // Martin & Barbara should be one generation below Ernst
    expect(gen('martin')).toBe(gen('barbara'));
    expect(gen('martin')).toBeGreaterThan(gen('ernst'));
  });
});
