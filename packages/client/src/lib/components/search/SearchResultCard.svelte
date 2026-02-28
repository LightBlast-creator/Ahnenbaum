<script lang="ts">
  interface SearchResult {
    type: string;
    id: string;
    title: string;
    snippet: string;
  }

  interface Props {
    result: SearchResult;
    typeIcons: Record<string, string>;
    href: string;
  }

  let { result, typeIcons, href }: Props = $props();
</script>

<a {href} class="result-card">
  <span class="result-icon">{typeIcons[result.type] ?? '📝'}</span>
  <div class="result-body">
    <span class="result-title">{result.title}</span>
    <span class="result-snippet">{result.snippet}</span>
  </div>
  <span class="result-type">{result.type}</span>
</a>

<style>
  .result-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: inherit;
  }

  .result-card:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-hover);
  }

  .result-icon {
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .result-title {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .result-snippet {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-type {
    margin-left: auto;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: capitalize;
    flex-shrink: 0;
  }
</style>
