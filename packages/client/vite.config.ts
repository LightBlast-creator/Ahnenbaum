import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    sveltekit(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      strategy: ['preferredLanguage', 'baseLocale'],
    }),
    {
      name: 'strip-codesplitting',
      configResolved(config) {
        const output = config.build?.rollupOptions?.output;
        if (output) {
          if (Array.isArray(output)) {
            output.forEach((o) => delete (o as Record<string, unknown>).codeSplitting);
          } else {
            delete (output as Record<string, unknown>).codeSplitting;
          }
        }
      },
    },
  ],
  server: {
    port: 5900,
    proxy: {
      '/api': 'http://localhost:3900',
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
