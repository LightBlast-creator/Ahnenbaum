<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolveRoute } from '$app/paths';
  import { page } from '$app/state';
  import * as m from '$lib/paraglide/messages';
  import { getAncestorTree, getPersons } from '$lib/data/mock-data';
  import TreeCanvas from '$lib/components/TreeCanvas.svelte';

  const rootIdParam = $derived(new URLSearchParams(page.url.search).get('root'));
  const defaultRootId = $derived(getPersons({ pageSize: 1 }).items[0]?.id ?? '');
  const rootId = $derived(rootIdParam || defaultRootId);
  const treeData = $derived(getAncestorTree(rootId, 4));

  function handlePersonClick(personId: string) {
    goto(resolveRoute('/persons/[id]', { id: personId }));
  }
</script>

<svelte:head>
  <title>{m.tree_title()} | {m.app_title()}</title>
</svelte:head>

<div class="tree-page">
  <TreeCanvas {treeData} onPersonClick={handlePersonClick} />
</div>

<style>
  .tree-page {
    height: calc(100vh - var(--header-height));
    margin: calc(-1 * var(--space-6));
  }
</style>
