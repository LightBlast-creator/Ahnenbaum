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

  import EmptyState from '$lib/components/EmptyState.svelte';
  import { layoutAncestorTree } from '$lib/utils/tree-layout';
  import type { TreeData } from '$lib/utils/tree-layout';
  import {
    layoutFamilyGraph,
    buildFamilyGroups,
    staggerFamilyGroupRails,
  } from '$lib/utils/family-graph-layout';
  import type { PositionedNode } from '$lib/utils/tree-layout';
  import type { GraphConnection, FamilyGroup } from '$lib/utils/family-graph-layout';

  const rootIdParam = $derived(new URLSearchParams(page.url.search).get('root'));

  let nodes = $state<PositionedNode[]>([]);
  let connections = $state<GraphConnection[]>([]);
  let familyGroups = $state<FamilyGroup[]>([]);
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

          // Build family groups from positioned nodes (shared utility)
          const positionOf = new Map(positioned.map((n) => [n.person.id, { x: n.x, y: n.y }]));
          const genMap = new Map(positioned.map((n) => [n.person.id, n.generation]));
          const groups = buildFamilyGroups(positioned, positionOf, genMap);
          staggerFamilyGroupRails(groups);

          nodes = positioned;
          connections = [];
          familyGroups = groups;
        } else {
          nodes = [];
          connections = [];
          familyGroups = [];
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
          familyGroups = layout.familyGroups;
        } else {
          nodes = [];
          connections = [];
          familyGroups = [];
        }
      }
    } catch (e) {
      console.error('[tree] loadTree error:', e);
      nodes = [];
      connections = [];
      familyGroups = [];
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
    <div class="tree-empty-wrapper">
      <EmptyState
        icon="tree"
        title={m.tree_empty()}
        actionLabel={m.person_add()}
        actionHref="#"
        onAction={() => {
          const event = new KeyboardEvent('keydown', { key: 'n', metaKey: true, bubbles: true });
          window.dispatchEvent(event);
        }}
      />
    </div>
  {:else}
    <TreeCanvas {nodes} {connections} {familyGroups} onPersonClick={handlePersonClick} />
  {/if}
</div>

<style>
  .tree-page {
    flex: 1;
    height: 100%;
    min-height: 0;
    margin: calc(-1 * var(--space-6));
    position: relative;
    display: flex;
    flex-direction: column;
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

  .tree-empty-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
