<script lang="ts">
  /**
   * LanguageSwitcher — compact locale selector for the sidebar.
   *
   * Uses Paraglide's getLocale/setLocale to switch language.
   * The `localStorage` strategy (added to compile flags) persists the choice.
   */

  import { getLocale, setLocale, locales, type Locale } from '$lib/paraglide/runtime.js';
  import * as m from '$lib/paraglide/messages';

  const languageLabels: Record<string, { flag: string; label: string }> = {
    en: { flag: '🇬🇧', label: 'English' },
    de: { flag: '🇩🇪', label: 'Deutsch' },
  };

  let open = $state(false);
  const currentLocale = $derived(getLocale());

  function switchLocale(locale: Locale) {
    setLocale(locale);
    open = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-switcher')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="language-switcher">
  <button
    class="language-btn"
    onclick={() => (open = !open)}
    aria-label={m.language_switch()}
    title={m.language_switch()}
  >
    <span class="language-flag">{languageLabels[currentLocale]?.flag ?? '🌐'}</span>
    <span class="language-code">{currentLocale.toUpperCase()}</span>
  </button>

  {#if open}
    <div class="language-dropdown" role="listbox" aria-label={m.language_label()}>
      {#each locales as locale (locale)}
        <button
          class="language-option"
          class:active={locale === currentLocale}
          role="option"
          aria-selected={locale === currentLocale}
          onclick={() => switchLocale(locale)}
        >
          <span class="language-flag">{languageLabels[locale]?.flag ?? '🌐'}</span>
          <span class="language-name">{languageLabels[locale]?.label ?? locale}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .language-switcher {
    position: relative;
    margin: var(--space-1) var(--space-2);
  }

  .language-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
    transition: all var(--transition-fast);
  }

  .language-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .language-flag {
    font-size: 16px;
    line-height: 1;
  }

  .language-code {
    font-weight: var(--font-weight-medium);
    font-family: var(--font-family);
  }

  .language-dropdown {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    margin-bottom: var(--space-1);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    z-index: var(--z-dropdown);
  }

  .language-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
  }

  .language-option:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .language-option.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
    font-weight: var(--font-weight-medium);
  }

  .language-name {
    font-family: var(--font-family);
  }
</style>
