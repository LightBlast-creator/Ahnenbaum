<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { api } from '$lib/api';

  interface Crumb {
    label: string;
    href: string;
  }

  // Cache person name for breadcrumb
  let personName = $state<string | undefined>(undefined);
  let lastPersonId = $state('');

  $effect(() => {
    const pathname = page.url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 1 && segments[0] === 'persons') {
      const personId = segments[1];
      if (personId !== lastPersonId) {
        lastPersonId = personId;
        personName = undefined;
        api
          .get<{ id: string; names: { given: string; surname: string; isPreferred: boolean }[] }>(
            `persons/${personId}`,
          )
          .then((data) => {
            const preferred = data.names.find((n) => n.isPreferred) ?? data.names[0];
            if (preferred) {
              personName = `${preferred.given} ${preferred.surname}`;
            }
          })
          .catch(() => {
            personName = undefined;
          });
      }
    } else {
      lastPersonId = '';
      personName = undefined;
    }
  });

  const crumbs = $derived.by((): Crumb[] => {
    const pathname = page.url.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const result: Crumb[] = [{ label: m.breadcrumb_home(), href: '/' }];

    if (segments.length === 0) return result;

    const sectionLabels: Record<string, () => string> = {
      persons: () => m.nav_people(),
      tree: () => m.nav_tree(),
      media: () => m.nav_media(),
      search: () => m.search_title(),
    };

    // First segment (section)
    const section = segments[0];
    result.push({
      label: sectionLabels[section]?.() ?? section,
      href: `/${section}`,
    });

    // If there's a second segment (e.g., person ID)
    if (segments.length > 1 && section === 'persons' && personName) {
      const personId = segments[1];
      result.push({
        label: personName,
        href: `/persons/${personId}`,
      });
    }

    return result;
  });
</script>

{#if crumbs.length > 1}
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      {#each crumbs as crumb, i (crumb.href)}
        <li>
          {#if i < crumbs.length - 1}
            <a href="{base}{crumb.href}">{crumb.label}</a>
            <span class="separator" aria-hidden="true">/</span>
          {:else}
            <span class="current" aria-current="page">{crumb.label}</span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .breadcrumbs {
    padding: var(--space-2) 0;
    margin-bottom: var(--space-2);
  }

  ol {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    list-style: none;
    font-size: var(--font-size-sm);
  }

  li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  a {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  a:hover {
    color: var(--color-primary);
  }

  .separator {
    color: var(--color-text-muted);
  }

  .current {
    color: var(--color-text);
    font-weight: var(--font-weight-medium);
  }
</style>
