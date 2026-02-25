import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.svelte-kit/**',
      '**/drizzle/**',
      '**/coverage/**',
      '**/paraglide/**',
    ],
  },

  // Base JS recommended + strict TS rules (non-type-checked)
  eslint.configs.recommended,
  ...tseslint.configs.strict,

  // Server — Node globals
  {
    files: ['packages/server/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Client — browser globals
  {
    files: ['packages/client/**/*.ts', 'packages/client/**/*.svelte'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Svelte files — svelte-eslint-parser with TS inside <script>
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // Config files (vitest.config.ts, drizzle.config.ts, etc.) — Node env
  {
    files: ['**/*.config.ts', '**/*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Prettier must be last — disables conflicting style rules
  prettier,
);
