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

## TypeScript: TS4023 with `better-sqlite3` namespaced types
- Exporting variables whose type is `BetterSqlite3.Database` (namespace type from `@types/better-sqlite3`) causes TS4023 "cannot be named" errors in declaration files.
- **Fix**: Import `type BetterSqlite3 from 'better-sqlite3'` in the exporting file and add explicit type annotations — TS needs the type import in scope to name it in `.d.ts`.

## drizzle-kit: Does not auto-create parent directories
- `drizzle-kit migrate` uses its own `better-sqlite3` instance and does NOT auto-create parent dirs for the DB file.
- **Fix**: Prefix the npm script with `mkdir -p data &&` to ensure the directory exists.

## npm: Always verify package versions against registry
- Web search results for "latest version" may be stale or wrong (e.g. `@eslint/js@^10.0.2` doesn't exist — latest is `10.0.1`).
- **Fix**: Before installing, run `npm view <pkg> version` to confirm actual latest. Same for `prettier-plugin-svelte` (v3, not v4).

