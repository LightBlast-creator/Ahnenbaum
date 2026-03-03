import { describe, it, expect } from 'vitest';
import {
  ancestorLayout,
  descendantLayout,
  type PersonRecord,
  type RelationshipRecord,
} from './chart-layout';

// ── Helpers ──────────────────────────────────────────────────────────

function person(id: string, given = 'Test', family = 'Person'): PersonRecord {
  return { id, givenName: given, familyName: family };
}

function parentRel(parentId: string, childId: string): RelationshipRecord {
  return {
    id: `rel-${parentId}-${childId}`,
    type: 'parent',
    person1Id: parentId,
    person2Id: childId,
  };
}

// ── ancestorLayout ──────────────────────────────────────────────────

describe('ancestorLayout', () => {
  it('returns a single node for root-only person', () => {
    const persons = [person('p1', 'Alice', 'Smith')];
    const result = ancestorLayout('p1', persons, []);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('p1');
    expect(result.nodes[0].label).toBe('Alice Smith');
    expect(result.nodes[0].generation).toBe(0);
    expect(result.edges).toHaveLength(0);
  });

  it('positions parents above the root (2 generations)', () => {
    const persons = [
      person('child', 'Child', 'One'),
      person('mom', 'Mom', 'One'),
      person('dad', 'Dad', 'One'),
    ];
    const rels = [parentRel('mom', 'child'), parentRel('dad', 'child')];

    const result = ancestorLayout('child', persons, rels);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    const child = result.nodes.find((n) => n.id === 'child');
    const mom = result.nodes.find((n) => n.id === 'mom');
    const dad = result.nodes.find((n) => n.id === 'dad');

    expect(child).toBeDefined();
    expect(mom).toBeDefined();
    expect(dad).toBeDefined();

    // Parents should be above (lower y means higher in ancestor layout after normalization)
    // Generation -1 is above generation 0
    expect(mom?.generation).toBe(-1);
    expect(dad?.generation).toBe(-1);
    expect(child?.generation).toBe(0);
  });

  it('deduplicates visited nodes (prevents cycles)', () => {
    const persons = [person('a'), person('b')];
    // Circular relationship: a is parent of b, b is parent of a
    const rels = [parentRel('a', 'b'), parentRel('b', 'a')];

    const result = ancestorLayout('a', persons, rels);

    // Should not infinite loop; each person appears at most once
    expect(result.nodes.length).toBeLessThanOrEqual(2);
  });

  it('handles missing person gracefully', () => {
    const persons = [person('p1')];
    // Reference a parent that does not exist in persons
    const rels = [parentRel('ghost', 'p1')];

    const result = ancestorLayout('p1', persons, rels);

    // Ghost node is skipped; only p1 appears
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('p1');
    // Edge is still recorded (from→to), but ghost node has no visual position
    expect(result.edges).toHaveLength(1);
  });

  it('returns empty for unknown root', () => {
    const result = ancestorLayout('nonexistent', [], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('normalizes positions to positive space', () => {
    const persons = [person('child'), person('parent')];
    const rels = [parentRel('parent', 'child')];

    const result = ancestorLayout('child', persons, rels);

    for (const node of result.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── descendantLayout ────────────────────────────────────────────────

describe('descendantLayout', () => {
  it('returns a single node for root-only person', () => {
    const persons = [person('p1', 'Solo', 'Person')];
    const result = descendantLayout('p1', persons, []);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('p1');
    expect(result.nodes[0].label).toBe('Solo Person');
    expect(result.edges).toHaveLength(0);
  });

  it('positions children below the root', () => {
    const persons = [
      person('root', 'Root', 'Person'),
      person('child1', 'Child', 'One'),
      person('child2', 'Child', 'Two'),
      person('child3', 'Child', 'Three'),
    ];
    const rels = [
      parentRel('root', 'child1'),
      parentRel('root', 'child2'),
      parentRel('root', 'child3'),
    ];

    const result = descendantLayout('root', persons, rels);

    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(3);

    const root = result.nodes.find((n) => n.id === 'root');
    const c1 = result.nodes.find((n) => n.id === 'child1');

    expect(root).toBeDefined();
    expect(c1).toBeDefined();

    // Children are generation 1, root is generation 0
    expect(root?.generation).toBe(0);
    expect(c1?.generation).toBe(1);
    // Children should be below root (higher y value)
    expect(c1?.y).toBeGreaterThan(root?.y ?? 0);
  });

  it('prevents cycles', () => {
    const persons = [person('a'), person('b')];
    const rels = [parentRel('a', 'b'), parentRel('b', 'a')];

    const result = descendantLayout('a', persons, rels);

    expect(result.nodes.length).toBeLessThanOrEqual(2);
  });

  it('handles empty persons array', () => {
    const result = descendantLayout('nonexistent', [], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('handles empty relationships array', () => {
    const persons = [person('p1')];
    const result = descendantLayout('p1', persons, []);

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });

  it('computes reasonable chart dimensions', () => {
    const persons = [person('root'), person('c1'), person('c2')];
    const rels = [parentRel('root', 'c1'), parentRel('root', 'c2')];

    const result = descendantLayout('root', persons, rels);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});
