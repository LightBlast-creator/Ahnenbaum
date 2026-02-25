# Code Conventions

> **Audience:** Developers and LLM agents working on Ahnenbaum.
> Every rule here is enforced by tooling or code review. Follow them exactly.

---

## Formatting

**Tool:** Prettier (config in `.prettierrc` at repo root)

| Setting         | Value            |
| --------------- | ---------------- |
| Single quotes   | `true`           |
| Trailing commas | `all`            |
| Print width     | `100`            |
| Tab width       | `2`              |
| Semicolons      | `true`           |
| Tabs            | `false` (spaces) |

Svelte files use `prettier-plugin-svelte` with the `svelte` parser.

**Auto-format on save.** Never manually adjust whitespace — let Prettier handle it.

---

## Linting

**Tool:** ESLint v10 with flat config (`eslint.config.js` at repo root)

| Layer           | Config                                                           |
| --------------- | ---------------------------------------------------------------- |
| Base            | `@eslint/js` recommended                                         |
| TypeScript      | `typescript-eslint` strict (non-type-checked)                    |
| Svelte          | `eslint-plugin-svelte` flat/recommended + `svelte-eslint-parser` |
| Prettier compat | `eslint-config-prettier` — **must be last**                      |

Environment globals:

- `packages/server/**` → Node.js globals
- `packages/client/**` → Browser globals
- `**/*.config.ts` / `**/*.config.js` → Node.js globals

**Pre-commit hook:** Husky + lint-staged runs `eslint --fix` and `prettier --write` on staged files.

---

## Naming

| What                  | Convention            | Example                                   |
| --------------------- | --------------------- | ----------------------------------------- |
| TypeScript files      | `kebab-case`          | `person-service.ts`, `media-upload.ts`    |
| Svelte components     | `PascalCase`          | `PersonCard.svelte`, `TreeView.svelte`    |
| Functions & variables | `camelCase`           | `getPersonById`, `mediaStore`             |
| Types & interfaces    | `PascalCase`          | `Person`, `HealthStatus`, `PluginContext` |
| Constants             | `UPPER_SNAKE_CASE`    | `APP_NAME`, `APP_VERSION`                 |
| CSS classes           | `kebab-case`          | `.person-card`, `.tree-view`              |
| Database tables       | `snake_case` (plural) | `persons`, `relationships`                |

---

## Imports

- **Cross-package:** Import via the workspace package name.
  ```typescript
  import { APP_NAME } from '@ahnenbaum/core';
  import type { Person } from '@ahnenbaum/core';
  ```
- **Within `packages/client`:** Use SvelteKit's `$lib` alias.
  ```typescript
  import { someStore } from '$lib/stores/some-store';
  ```
- **Within a package:** Use relative imports. Keep them shallow (avoid `../../../`).
- **Never** import directly between `@ahnenbaum/server` and `@ahnenbaum/client`. All shared types go through `@ahnenbaum/core`.

---

## Barrel Exports

Each package exposes its public API through a single `src/index.ts` barrel file. Everything not re-exported from the barrel is considered private.

```typescript
// packages/core/src/index.ts
export { APP_NAME, APP_VERSION } from './constants';
export type { HealthStatus } from './types';
export type { Person } from './models/index';
```

When adding new public types or functions, add them to the barrel. When consuming a package, import only from the barrel — never reach into internal files.

---

## Error Handling

Use **Result types** over thrown exceptions:

```typescript
type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };
```

**Why:** LLMs handle explicit return values more reliably than try/catch. Result types make error paths visible in the type signature.

**Exception:** Third-party libraries that throw (e.g. `better-sqlite3`) — wrap them at the boundary and return `Result` from your service layer.

---

## Internationalisation (i18n)

**No hardcoded user-facing strings.** Every piece of text the user sees goes through the i18n system (Paraglide.js).

- Language files live in `packages/core/src/i18n/` (`en.json`, `de.json`)
- Keys use `snake_case` with dot-separated namespaces: `person.add`, `search.placeholder`
- Default languages: English + German
- Missing translation keys cause a build failure (type-safe)

---

## File Size

**Target ~300 lines per file.** If a file grows beyond this, split it.

LLMs lose accuracy on files > 500 lines. Smaller files = more precise edits = fewer bugs.

---

## Testing

**Framework:** Vitest (all packages)

| Rule        | Detail                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------- |
| Scope       | Every module's public API has tests                                                          |
| Location    | Test files live alongside source: `foo.ts` → `foo.test.ts`                                   |
| Testability | Separate pure logic (`app.ts`) from side-effects (`index.ts`) — tests import the pure module |
| Coverage    | Target near-100%. Never decrease coverage without documented justification                   |
| CI          | `vitest run` in every PR — must pass before merge                                            |

---

## Git Workflow

### Branching

- **One feature = one branch.** Never two people on the same branch.
- Branch names: `feat/short-description`, `fix/short-description`, `docs/short-description`
- Small, focused PRs. Each branch creates its own migration file if touching the DB.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add person search endpoint
fix: correct date parsing for BC dates
docs: update ARCHITECTURE.md with plugin loader
test: add integration tests for media upload
refactor: extract relationship validation to shared util
chore: bump drizzle-orm to 0.46
```

Scope is optional but encouraged: `feat(server): add person search endpoint`

---

## Database

| Rule                     | Detail                                                                            |
| ------------------------ | --------------------------------------------------------------------------------- |
| ORM                      | Drizzle ORM — type-safe, lightweight                                              |
| Migrations               | Generated via `drizzle-kit generate` — **never hand-write migration SQL**         |
| One migration per branch | Each feature branch creates its own migration file                                |
| Schema changes           | Update types in `@ahnenbaum/core` first, then the Drizzle schema — contract-first |
| DB file location         | `packages/server/data/ahnenbaum.db` (gitignored)                                  |
| Seed data                | `seed.ts` script creates a test family for consistent dev data                    |

---

## CI Pipeline (GitHub Actions)

Every PR must pass before merge:

| Step        | What it checks                     |
| ----------- | ---------------------------------- |
| `lint`      | ESLint + Prettier                  |
| `typecheck` | `tsc --noEmit` across all packages |
| `test`      | `vitest run` — all tests pass      |
| `build`     | Full production build succeeds     |

---

_This document is a living artifact. Update it when conventions change._
