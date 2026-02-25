# Lessons Learned

> Patterns, mistakes, and insights accumulated during development.
> Updated automatically after corrections — reviewed at session start.

## Hono: Separate app from server startup
- Importing `index.ts` that calls `serve()` during Vitest starts a real HTTP server → `EADDRINUSE`.
- **Fix**: Routes in `app.ts` (pure). `serve()` in `index.ts` (entry only). Tests import `app.ts`.

## Vitest: Exclude dist/ from test discovery
- After `tsc` build, Vitest picks up compiled `.js` tests in `dist/` alongside `.ts` source tests.
- **Fix**: `exclude: ['dist/**', 'node_modules/**']` in `vitest.config.ts`.

## TypeScript: Use `bundler` moduleResolution for SvelteKit/Vite
- `NodeNext` forces `.js` extensions on relative imports, breaking SvelteKit/Vite.
- **Fix**: `"moduleResolution": "bundler"` in `tsconfig.base.json`.
