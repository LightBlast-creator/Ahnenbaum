# Architecture

> **Audience:** Developers and LLM agents working on Ahnenbaum.
> This document maps what lives where. Keep it in sync with the actual repo.

---

## Overview

Ahnenbaum is a self-hostable web application for ancestry and family tree tracking. It uses a monorepo with npm workspaces, where each package has strict boundaries.

```
Browser (SPA)  ──REST API──▸  Server  ──Drizzle ORM──▸  SQLite
   │                           │
   SvelteKit                   Hono + Node.js
   │                           │
   └── @ahnenbaum/core ◂──────┘
       (shared types)
```

---

## Package Map

### `@ahnenbaum/core` — `packages/core/`

Shared types, constants, and (future) plugin API. This is the **contract layer** — both server and client depend on it, but it depends on nothing.

| Directory          | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `src/constants.ts` | App-wide constants (`APP_NAME`, `APP_VERSION`)            |
| `src/types.ts`     | Shared response types (`HealthStatus`)                    |
| `src/models/`      | Domain model interfaces (`Person`)                        |
| `src/i18n/`        | Language files (planned)                                  |
| `src/plugin-api/`  | Plugin interface, hook definitions, panel slots (planned) |
| `src/index.ts`     | Barrel export — **the only import surface**               |

**Depends on:** nothing
**Depended on by:** `@ahnenbaum/server`, `@ahnenbaum/client`, plugins

---

### `@ahnenbaum/server` — `packages/server/`

Hono-based REST API server with SQLite persistence via Drizzle ORM.

| Directory              | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `src/app.ts`           | Hono app with route registrations (pure — no side effects)   |
| `src/index.ts`         | Server entry point — calls `serve()` (not imported by tests) |
| `src/db/schema.ts`     | Drizzle ORM table definitions                                |
| `src/db/connection.ts` | Database connection factory                                  |
| `src/db/index.ts`      | DB barrel export                                             |
| `src/routes/`          | API route handlers (planned)                                 |
| `src/services/`        | Business logic layer (planned)                               |
| `src/plugin-runtime/`  | Server-side plugin loader (planned)                          |
| `drizzle/`             | Generated migration files (gitignored from lint)             |
| `drizzle.config.ts`    | Drizzle Kit configuration                                    |
| `data/`                | SQLite database files (gitignored)                           |

**Depends on:** `@ahnenbaum/core`
**Depended on by:** nothing (it's the top of the server dependency chain)

---

### `@ahnenbaum/client` — `packages/client/`

SvelteKit single-page application.

| Directory               | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `src/routes/`           | SvelteKit page routes                        |
| `src/lib/components/`   | Reusable UI components (planned)             |
| `src/lib/stores/`       | Svelte stores for state management (planned) |
| `src/lib/plugin-slots/` | UI injection points for plugins (planned)    |
| `src/app.html`          | HTML shell                                   |
| `src/app.d.ts`          | SvelteKit type declarations                  |
| `svelte.config.js`      | SvelteKit configuration (adapter-node)       |
| `vite.config.ts`        | Vite build config                            |
| `static/`               | Static assets                                |

**Depends on:** `@ahnenbaum/core`
**Depended on by:** nothing (it's the top of the client dependency chain)

---

### `packages/plugins/`

Placeholder for first-party plugins. Currently contains only a `README.md`.

Future plugins:

- `charts/` — Pedigree, fan, descendancy charts
- `gedcom/` — GEDCOM 7.0 + 5.5.1 import/export

---

## Dependency Graph

```
                  ┌─────────────────┐
                  │ @ahnenbaum/core │
                  │  (shared types) │
                  └────────┬────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
              ▼                         ▼
   ┌──────────────────┐     ┌──────────────────┐
   │ @ahnenbaum/server│     │ @ahnenbaum/client│
   │  (Hono + SQLite) │     │   (SvelteKit)    │
   └──────────────────┘     └──────────────────┘
              │                         │
              ▼                         ▼
         SQLite file              Browser (SPA)
```

**Hard rule:** Server and client **never** import each other. All shared contracts go through `@ahnenbaum/core`.

---

## Data Flow

```
User ──▸ Browser (SvelteKit SPA)
              │
              │  HTTP REST (JSON)
              ▼
         Hono Server
              │
              │  Drizzle ORM
              ▼
         SQLite (.db file)
              │
              │  File system
              ▼
         Media storage (local)
```

**Planned:** WebSocket connection for real-time collaboration updates.

---

## Technology Stack

| Layer      | Technology                       | Version            |
| ---------- | -------------------------------- | ------------------ |
| Runtime    | Node.js                          | ≥ 22               |
| Language   | TypeScript                       | 5.9+ (strict mode) |
| Frontend   | SvelteKit                        | 2.x                |
| Backend    | Hono                             | 4.x                |
| Database   | SQLite via better-sqlite3        | —                  |
| ORM        | Drizzle ORM                      | 0.45+              |
| Build      | Vite (client), tsc (core/server) | —                  |
| Testing    | Vitest                           | 4.x                |
| Linting    | ESLint 10 + typescript-eslint    | —                  |
| Formatting | Prettier 3                       | —                  |
| CI         | GitHub Actions                   | —                  |

---

## Plugin Architecture (Planned)

Plugins are TypeScript modules implementing the `AhnenbaumPlugin` interface (defined in `@ahnenbaum/core`):

```typescript
interface AhnenbaumPlugin {
  name: string;
  version: string;
  description?: string;
  activate(ctx: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
  routes?: RouteDefinition[];
  panels?: PanelDefinition[];
  hooks?: HookRegistration[];
  schemas?: SchemaExtension[];
}
```

- Plugins run **in-process** (no sandboxing) — trust model: only install what you trust
- Server-side plugin loader in `packages/server/src/plugin-runtime/`
- Client-side panel slots in `packages/client/src/lib/plugin-slots/`
- Plugin API routes under `/api/plugins/{name}/`

---

## Directory Tree (Current)

```
ahnenbaum/
├── ARCHITECTURE.md            ← You are here
├── CONVENTIONS.md             ← Code rules for devs and LLMs
├── package.json               ← Root workspace config
├── tsconfig.base.json         ← Shared TypeScript settings
├── eslint.config.js           ← ESLint flat config
├── .prettierrc                ← Prettier settings
├── .prettierignore
├── .gitignore
├── .husky/                    ← Git hooks (pre-commit)
├── .agent/                    ← Shared LLM agent configuration
│   ├── rules/
│   │   ├── criticalrules.md   ← Hard guardrails for LLM agents
│   │   └── lessons.md         ← Accumulated lessons from development
│   ├── skills/                ← Agent skill definitions
│   └── workflows/             ← Reusable agent workflows
├── documents/
│   ├── PRD.md                 ← Product Requirements Document
│   └── research_comprehensive.md
├── packages/
│   ├── core/                  ← @ahnenbaum/core
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts       ← Barrel export
│   │       ├── constants.ts   ← APP_NAME, APP_VERSION
│   │       ├── types.ts       ← HealthStatus
│   │       └── models/
│   │           └── index.ts   ← Person interface
│   ├── server/                ← @ahnenbaum/server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   ├── drizzle.config.ts
│   │   ├── .env.example
│   │   ├── drizzle/           ← Generated migrations
│   │   └── src/
│   │       ├── index.ts       ← Server entry (serve())
│   │       ├── app.ts         ← Hono app (pure, testable)
│   │       └── db/
│   │           ├── schema.ts      ← Drizzle table definitions
│   │           ├── connection.ts  ← DB connection factory
│   │           ├── index.ts       ← DB barrel export
│   │           └── db.test.ts
│   ├── client/                ← @ahnenbaum/client
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   ├── static/
│   │   └── src/
│   │       ├── app.html
│   │       ├── app.d.ts
│   │       ├── routes/
│   │       └── lib/
│   │           ├── index.ts
│   │           ├── index.test.ts
│   │           └── assets/
│   │               └── favicon.svg
│   └── plugins/               ← First-party plugins (placeholder)
│       └── README.md
└── node_modules/
```

---

_This document is a living artifact. Update it when the structure changes._
