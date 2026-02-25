<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';

  const statusCode = $derived(page.status);
  const isNotFound = $derived(statusCode === 404);
</script>

<svelte:head>
  <title>{isNotFound ? m.error_not_found() : m.error_generic()} | {m.app_title()}</title>
</svelte:head>

<div class="error-page">
  <div class="error-icon">{isNotFound ? '🔍' : '⚠️'}</div>
  <h1 class="error-code">{statusCode}</h1>
  <p class="error-message">
    {isNotFound ? m.error_not_found() : m.error_generic()}
  </p>
  <div class="error-actions">
    <a href="{base}/" class="btn-primary">{m.error_go_home()}</a>
    <button class="btn-secondary" onclick={() => history.back()}>
      {m.error_go_back()}
    </button>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    gap: var(--space-4);
  }

  .error-icon {
    font-size: 4rem;
  }

  .error-code {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-muted);
  }

  .error-message {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    max-width: 400px;
  }

  .error-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-4);
  }

  .btn-primary {
    padding: var(--space-2) var(--space-6);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
    transition: background var(--transition-fast);
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    color: var(--color-text-inverse);
  }

  .btn-secondary {
    padding: var(--space-2) var(--space-6);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    border-radius: var(--radius-md);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .btn-secondary:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
</style>
