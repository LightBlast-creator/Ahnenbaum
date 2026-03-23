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
    expect(result.nodes[0].generation).toBe(0);
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
    expect(parentNode.generation).toBe(0);
    expect(childNode.generation).toBe(1);
  });

  it('creates family groups for parent-child edges', () => {
    const persons = [makePerson('parent', 'Klaus', 'Müller'), makePerson('child', 'Max', 'Müller')];
    const edges: GraphEdge[] = [
      { id: 'r1', personAId: 'parent', personBId: 'child', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    // Parent-child connections are now represented as family groups (T-connectors)
    expect(result.familyGroups.length).toBeGreaterThanOrEqual(1);
    expect(result.familyGroups[0].parentIds).toContain('parent');
    expect(result.familyGroups[0].childIds).toContain('child');
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
    expect(gp.generation).toBe(0);
    expect(p.generation).toBe(1);
    expect(c.generation).toBe(2);
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

  it('places cross-group couple children under their parents, not between groups', () => {
    // Probst family scenario:
    // Ernst & Helene → parents of Martin and Thomas
    // Helmut & Lieselotte → parents of Barbara and Heidi
    // Martin married Barbara (cross-group couple)
    // Thomas married Conny (in-group partner, no parents)
    // Martin & Barbara → children: Patrick, Pascal
    // Thomas → children: Marc, Nadja (only one parent listed)
    const persons = [
      makePerson('ernst', 'Ernst', 'Probst'),
      makePerson('helene', 'Helene', 'Probst'),
      makePerson('helmut', 'Helmut', 'Brekle'),
      makePerson('lieselotte', 'Lieselotte', 'Brekle'),
      makePerson('martin', 'Martin', 'Probst'),
      makePerson('thomas', 'Thomas', 'Probst'),
      makePerson('barbara', 'Barbara', 'Probst'),
      makePerson('heidi', 'Heidi', 'Eisenbarth'),
      makePerson('conny', 'Conny', 'Probst'),
      makePerson('werner', 'Werner', 'Eisenbarth'),
      makePerson('patrick', 'Patrick', 'Probst'),
      makePerson('pascal', 'Pascal', 'Probst'),
      makePerson('marc', 'Marc', 'Probst'),
      makePerson('nadja', 'Nadja', 'Probst'),
    ];
    const edges: GraphEdge[] = [
      // Ernst & Helene → Martin, Thomas
      { id: 'r1', personAId: 'ernst', personBId: 'martin', type: 'biological_parent' },
      { id: 'r2', personAId: 'helene', personBId: 'martin', type: 'biological_parent' },
      { id: 'r3', personAId: 'ernst', personBId: 'thomas', type: 'biological_parent' },
      { id: 'r4', personAId: 'helene', personBId: 'thomas', type: 'biological_parent' },
      // Helmut & Lieselotte → Barbara, Heidi
      { id: 'r5', personAId: 'helmut', personBId: 'barbara', type: 'biological_parent' },
      { id: 'r6', personAId: 'lieselotte', personBId: 'barbara', type: 'biological_parent' },
      { id: 'r7', personAId: 'helmut', personBId: 'heidi', type: 'biological_parent' },
      { id: 'r8', personAId: 'lieselotte', personBId: 'heidi', type: 'biological_parent' },
      // Marriages
      { id: 'r9', personAId: 'martin', personBId: 'barbara', type: 'marriage' },
      { id: 'r10', personAId: 'thomas', personBId: 'conny', type: 'marriage' },
      { id: 'r11', personAId: 'heidi', personBId: 'werner', type: 'marriage' },
      // Martin & Barbara → Patrick, Pascal
      { id: 'r12', personAId: 'martin', personBId: 'patrick', type: 'biological_parent' },
      { id: 'r13', personAId: 'barbara', personBId: 'patrick', type: 'biological_parent' },
      { id: 'r14', personAId: 'martin', personBId: 'pascal', type: 'biological_parent' },
      { id: 'r15', personAId: 'barbara', personBId: 'pascal', type: 'biological_parent' },
      // Thomas → Marc, Nadja
      { id: 'r16', personAId: 'thomas', personBId: 'marc', type: 'biological_parent' },
      { id: 'r17', personAId: 'thomas', personBId: 'nadja', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);

    const posOf = (id: string) => {
      const node = result.nodes.find((n) => n.person.id === id);
      if (!node) throw new Error(`Node not found: ${id}`);
      return { x: node.x, y: node.y };
    };

    const martinPos = posOf('martin');
    const barbaraPos = posOf('barbara');
    const patrickPos = posOf('patrick');
    const pascalPos = posOf('pascal');
    const marcPos = posOf('marc');
    const nadjaPos = posOf('nadja');

    // Martin and Barbara should be adjacent — no one between them on the X axis
    const martinX = martinPos.x;
    const barbaraX = barbaraPos.x;
    const minCoupleX = Math.min(martinX, barbaraX);
    const maxCoupleX = Math.max(martinX, barbaraX);

    const gen1Nodes = result.nodes.filter(
      (n) => n.y === martinPos.y && n.person.id !== 'martin' && n.person.id !== 'barbara',
    );
    const betweenCouple = gen1Nodes.filter((n) => n.x > minCoupleX && n.x < maxCoupleX);
    expect(betweenCouple).toHaveLength(0);

    // Patrick and Pascal should be centered under Martin+Barbara, not under Thomas
    const coupleCenter = (martinX + barbaraX) / 2;
    const childrenCenter = (patrickPos.x + pascalPos.x) / 2;
    expect(Math.abs(childrenCenter - coupleCenter)).toBeLessThan(150);

    // Marc and Nadja should NOT be interleaved between Patrick and Pascal
    const patrickMinX = Math.min(patrickPos.x, pascalPos.x);
    const patrickMaxX = Math.max(patrickPos.x, pascalPos.x);
    const marcBetween = marcPos.x > patrickMinX && marcPos.x < patrickMaxX;
    const nadjaBetween = nadjaPos.x > patrickMinX && nadjaPos.x < patrickMaxX;
    expect(marcBetween || nadjaBetween).toBe(false);
  });

  it('aligns in-law parents to same generation as their counterpart parents (full family)', () => {
    // Full Probst family tree from live data (simplified).
    // Friedrich+Berta → Ernst. Ernst+Helene → Martin, Wolfgang, Thomas.
    // Helmut+Lieselott → Barbara, Heidi.
    // Martin married Barbara. Heidi married Werner.
    // Wolfgang married Erika. Thomas married Conny.
    // Martin+Barbara → Patrick, Pascal. Thomas → Marc, Nadja.
    // Patrick+Tatu → Amara. Wolfgang+Erika → Anja, Steffanie.
    // Anja+Basti → Philipp.
    const persons = [
      makePerson('friedrich', 'Friedrich', 'Probst'),
      makePerson('berta', 'Berta', 'Pfeiffer'),
      makePerson('ernst', 'Ernst', 'Probst'),
      makePerson('helene', 'Helene', 'Probst'),
      makePerson('helmut', 'Helmut', 'Brekle'),
      makePerson('lieselott', 'Lieselott', 'Brekle'),
      makePerson('martin', 'Martin', 'Probst'),
      makePerson('wolfgang', 'Wolfgang', 'Probst'),
      makePerson('thomas', 'Thomas', 'Probst'),
      makePerson('barbara', 'Barbara', 'Probst'),
      makePerson('heidi', 'Heidi', 'Eisenbarth'),
      makePerson('werner', 'Werner', 'Eisenbarth'),
      makePerson('erika', 'Erika', 'Probst'),
      makePerson('conny', 'Conny', 'Probst'),
      makePerson('patrick', 'Patrick', 'Probst'),
      makePerson('pascal', 'Pascal', 'Probst'),
      makePerson('tatu', 'Tatu', 'Probst'),
      makePerson('lisa', 'Lisa', 'Probst'),
      makePerson('amara', 'Amara', 'Probst'),
      makePerson('marc', 'Marc', 'Probst'),
      makePerson('nadja', 'Nadja', 'Probst'),
      makePerson('anja', 'Anja', 'Probst'),
      makePerson('steffanie', 'Steffanie', 'Probst'),
      makePerson('basti', 'Basti', 'Probst-Böhm'),
      makePerson('philipp', 'Philipp', 'Böhm'),
    ];

    const edges: GraphEdge[] = [
      // Friedrich+Berta → Ernst
      { id: 'e1', personAId: 'friedrich', personBId: 'ernst', type: 'biological_parent' },
      { id: 'e2', personAId: 'berta', personBId: 'ernst', type: 'biological_parent' },
      { id: 'e3', personAId: 'berta', personBId: 'friedrich', type: 'marriage' },
      // Ernst+Helene
      { id: 'e4', personAId: 'helene', personBId: 'ernst', type: 'marriage' },
      { id: 'e5', personAId: 'ernst', personBId: 'martin', type: 'biological_parent' },
      { id: 'e6', personAId: 'helene', personBId: 'martin', type: 'biological_parent' },
      { id: 'e7', personAId: 'ernst', personBId: 'wolfgang', type: 'biological_parent' },
      { id: 'e8', personAId: 'helene', personBId: 'wolfgang', type: 'biological_parent' },
      { id: 'e9', personAId: 'ernst', personBId: 'thomas', type: 'biological_parent' },
      { id: 'e10', personAId: 'helene', personBId: 'thomas', type: 'biological_parent' },
      // Helmut+Lieselott → Barbara, Heidi
      { id: 'e11', personAId: 'helmut', personBId: 'lieselott', type: 'marriage' },
      { id: 'e12', personAId: 'helmut', personBId: 'barbara', type: 'biological_parent' },
      { id: 'e13', personAId: 'lieselott', personBId: 'barbara', type: 'biological_parent' },
      { id: 'e14', personAId: 'helmut', personBId: 'heidi', type: 'biological_parent' },
      { id: 'e15', personAId: 'lieselott', personBId: 'heidi', type: 'biological_parent' },
      // Marriages
      { id: 'e16', personAId: 'martin', personBId: 'barbara', type: 'marriage' },
      { id: 'e17', personAId: 'heidi', personBId: 'werner', type: 'marriage' },
      { id: 'e18', personAId: 'erika', personBId: 'wolfgang', type: 'marriage' },
      { id: 'e19', personAId: 'conny', personBId: 'thomas', type: 'marriage' },
      { id: 'e20', personAId: 'tatu', personBId: 'patrick', type: 'marriage' },
      { id: 'e21', personAId: 'lisa', personBId: 'pascal', type: 'marriage' },
      { id: 'e22', personAId: 'basti', personBId: 'anja', type: 'marriage' },
      // Martin+Barbara → Patrick, Pascal
      { id: 'e23', personAId: 'martin', personBId: 'patrick', type: 'biological_parent' },
      { id: 'e24', personAId: 'barbara', personBId: 'patrick', type: 'biological_parent' },
      { id: 'e25', personAId: 'martin', personBId: 'pascal', type: 'biological_parent' },
      { id: 'e26', personAId: 'barbara', personBId: 'pascal', type: 'biological_parent' },
      // Patrick+Tatu → Amara
      { id: 'e27', personAId: 'patrick', personBId: 'amara', type: 'biological_parent' },
      { id: 'e28', personAId: 'tatu', personBId: 'amara', type: 'biological_parent' },
      // Thomas → Marc, Nadja
      { id: 'e29', personAId: 'thomas', personBId: 'marc', type: 'biological_parent' },
      { id: 'e30', personAId: 'thomas', personBId: 'nadja', type: 'biological_parent' },
      // Wolfgang+Erika → Anja, Steffanie
      { id: 'e31', personAId: 'wolfgang', personBId: 'anja', type: 'biological_parent' },
      { id: 'e32', personAId: 'erika', personBId: 'anja', type: 'biological_parent' },
      { id: 'e33', personAId: 'wolfgang', personBId: 'steffanie', type: 'biological_parent' },
      { id: 'e34', personAId: 'erika', personBId: 'steffanie', type: 'biological_parent' },
      // Anja+Basti → Philipp
      { id: 'e35', personAId: 'anja', personBId: 'philipp', type: 'biological_parent' },
      { id: 'e36', personAId: 'basti', personBId: 'philipp', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);

    const genOf = (id: string) => {
      const node = result.nodes.find((n) => n.person.id === id);
      if (!node) throw new Error(`Node not found: ${id}`);
      return node.generation;
    };

    // Friedrich + Berta should be at the top (gen 0)
    expect(genOf('friedrich')).toBe(0);
    expect(genOf('berta')).toBe(0);

    // Helmut + Lieselott should be at gen 1 — same as Ernst + Helene
    // NOT at gen 0 with Friedrich + Berta
    expect(genOf('ernst')).toBe(1);
    expect(genOf('helene')).toBe(1);
    expect(genOf('helmut')).toBe(1);
    expect(genOf('lieselott')).toBe(1);

    // Children of Ernst+Helene and Helmut+Lieselott should be at gen 2
    expect(genOf('martin')).toBe(2);
    expect(genOf('barbara')).toBe(2);
    expect(genOf('heidi')).toBe(2);
    expect(genOf('wolfgang')).toBe(2);
    expect(genOf('thomas')).toBe(2);
  });
  it('handles conflicting parent-child + marriage without infinite loop', () => {
    // Bug reproduction: person A is both biological_parent of AND married to person B.
    // This creates an impossible generation constraint that caused infinite oscillation.
    // The fix strips conflicting pairs from the partner map, so parent-child wins.
    const persons = [
      makePerson('parentSpouse', 'A', 'X'),
      makePerson('childSpouse', 'B', 'X'),
      makePerson('grandchild', 'C', 'X'),
    ];
    const edges: GraphEdge[] = [
      // A is parent of B
      { id: 'r1', personAId: 'parentSpouse', personBId: 'childSpouse', type: 'biological_parent' },
      // A is also married to B (conflicting!)
      { id: 'r2', personAId: 'parentSpouse', personBId: 'childSpouse', type: 'marriage' },
      // B is parent of C (to test that generations still propagate correctly)
      { id: 'r3', personAId: 'childSpouse', personBId: 'grandchild', type: 'biological_parent' },
    ];

    // This should complete without hanging (the bug caused an infinite loop)
    const result = layoutFamilyGraph(persons, edges);

    expect(result.nodes).toHaveLength(3);

    const genOf = (id: string) => {
      const node = result.nodes.find((n) => n.person.id === id);
      if (!node) throw new Error(`Node not found: ${id}`);
      return node.generation;
    };

    // Parent-child constraint should win: A at gen 0, B at gen 1, C at gen 2
    expect(genOf('parentSpouse')).toBeLessThan(genOf('childSpouse'));
    expect(genOf('childSpouse')).toBeLessThan(genOf('grandchild'));
  });

  it('handles transitive ancestor-partner conflict from co-parent inference', () => {
    // Production bug reproduction: Grandmother (GM) is listed as biological_parent
    // of both her child (P) and grandchild (GC).  P and spouse (SP) are also parents
    // of GC.  Co-parent inference links GM ↔ SP ↔ P as partners (all co-parents of
    // GC).  Partner-sync chains force GM = SP = P (same gen), but GM is parent of P.
    // Without cluster pruning, this makes the correction loop diverge.
    const persons = [
      makePerson('gm', 'Grandmother', 'X'),
      makePerson('gf', 'Grandfather', 'X'),
      makePerson('parent', 'Parent', 'X'),
      makePerson('spouse', 'Spouse', 'X'),
      makePerson('gc', 'Grandchild', 'X'),
    ];
    const edges: GraphEdge[] = [
      // Grandparents married
      { id: 'r1', personAId: 'gf', personBId: 'gm', type: 'marriage' },
      // GM is parent of parent (correct)
      { id: 'r2', personAId: 'gm', personBId: 'parent', type: 'biological_parent' },
      // GF is parent of parent (correct)
      { id: 'r3', personAId: 'gf', personBId: 'parent', type: 'biological_parent' },
      // Parent married to Spouse
      { id: 'r4', personAId: 'parent', personBId: 'spouse', type: 'marriage' },
      // Parent is parent of GC
      { id: 'r5', personAId: 'parent', personBId: 'gc', type: 'biological_parent' },
      // Spouse is parent of GC
      { id: 'r6', personAId: 'spouse', personBId: 'gc', type: 'biological_parent' },
      // GM is ALSO listed as parent of GC (data error — she's grandmother, not parent)
      // This triggers co-parent inference: GM ↔ parent ↔ spouse all co-parents of GC
      { id: 'r7', personAId: 'gm', personBId: 'gc', type: 'biological_parent' },
    ];

    const result = layoutFamilyGraph(persons, edges);
    expect(result.nodes).toHaveLength(5);

    const genOf = (id: string) => {
      const node = result.nodes.find((n) => n.person.id === id);
      if (!node) throw new Error(`Node not found: ${id}`);
      return node.generation;
    };

    // GM must be strictly above parent (ancestor constraint wins over partner-sync)
    expect(genOf('gm')).toBeLessThan(genOf('parent'));
    // Parent must be above grandchild
    expect(genOf('parent')).toBeLessThan(genOf('gc'));
    // Grandparents share a generation
    expect(genOf('gm')).toBe(genOf('gf'));
  });
});
