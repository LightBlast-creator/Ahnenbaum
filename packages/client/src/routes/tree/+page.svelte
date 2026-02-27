<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolveRoute } from '$app/paths';
  import { page } from '$app/state';
  import * as m from '$lib/paraglide/messages';
  import {
    api,
    toPersonWithDetails,
    type ServerTreeNode,
    type ServerPersonResponse,
  } from '$lib/api';
  import TreeCanvas from '$lib/components/TreeCanvas.svelte';
  import { layoutAncestorTree } from '$lib/utils/tree-layout';
  import type { TreeData } from '$lib/utils/tree-layout';
  import { layoutFamilyGraph } from '$lib/utils/family-graph-layout';
  import type { PositionedNode } from '$lib/utils/tree-layout';
  import type { GraphConnection } from '$lib/utils/family-graph-layout';

  const rootIdParam = $derived(new URLSearchParams(page.url.search).get('root'));
  let nodes = $state<PositionedNode[]>([]);
  let connections = $state<GraphConnection[]>([]);
  let loading = $state(true);

  // Transform server TreeNodeResponse into client TreeData (for ancestor mode)
  function toTreeData(node: ServerTreeNode): TreeData {
    return {
      person: toPersonWithDetails(node.person),
      parents: (node.parents ?? []).map(toTreeData),
    };
  }

  async function loadTree() {
    loading = true;
    try {
      if (rootIdParam) {
        // ─── Ancestor pedigree mode ───
        const serverTree = await api.get<ServerTreeNode>(`tree/${rootIdParam}`, { generations: 4 });
        if (serverTree) {
          const treeData = toTreeData(serverTree);
          const positioned = layoutAncestorTree(treeData);
          // Build connections from parentIds (ancestor trees connect upward)
          const nodeMap = new Map(positioned.map((n) => [n.person.id, n]));
          const ancestorConnections: GraphConnection[] = [];
          for (const node of positioned) {
            for (const parentId of node.parentIds) {
              const parent = nodeMap.get(parentId);
              if (parent) {
                ancestorConnections.push({
                  x1: node.x,
                  y1: node.y - 40,
                  x2: parent.x,
                  y2: parent.y + 40,
                  type: 'parent-child',
                });
              }
            }
          }
          nodes = positioned;
          connections = ancestorConnections;
        } else {
          nodes = [];
          connections = [];
        }
      } else {
        // ─── Full family graph mode ───
        const fullTree = await api.get<{
          persons: unknown[];
          relationships: { id: string; personAId: string; personBId: string; type: string }[];
        }>('tree/full');

        if (fullTree) {
          const persons = (fullTree.persons as ServerPersonResponse[]).map((p) =>
            toPersonWithDetails(p),
          );
          const layout = layoutFamilyGraph(persons, fullTree.relationships);
          nodes = layout.nodes;
          connections = layout.connections;
        } else {
          nodes = [];
          connections = [];
        }
      }
    } catch (e) {
      console.error('[tree] loadTree error:', e);
      nodes = [];
      connections = [];
    }
    loading = false;
  }

  $effect(() => {
    void rootIdParam;
    loadTree();
  });

  function handlePersonClick(personId: string) {
    goto(resolveRoute('/persons/[id]', { id: personId }));
  }
</script>

<svelte:head>
  <title>{m.tree_title()} | {m.app_title()}</title>
</svelte:head>

<div class="tree-page">
  {#if loading}
    <div class="tree-status">{m.loading()}</div>
  {:else if nodes.length === 0}
    <div class="tree-status">{m.tree_empty()}</div>
  {:else}
    <TreeCanvas {nodes} {connections} onPersonClick={handlePersonClick} />
  {/if}
</div>

<style>
  .tree-page {
    flex: 1;
    min-height: 0;
    margin: calc(-1 * var(--space-6));
    position: relative;
  }

  .tree-status {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
