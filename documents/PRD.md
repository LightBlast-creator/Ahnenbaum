# Ahnenbaum — Product Requirements Document

> **Version:** 1.2  
> **Date:** 2026-02-25  
> **Status:** Draft — awaiting review  
> **Based on:** [Comprehensive market research](file:///Users/patrickprobst/Downloads/Ahnenbaum/documents/research_comprehensive.md)

---

## 1. Vision

**Ahnenbaum** is a modern, self-hostable web application for ancestry and family tree tracking. It combines the depth of professional genealogy tools with the polish and ease of consumer cloud platforms — without the data lock-in, subscription fees, or bloat.

**Design philosophy: KISS but powerful.**

- A rock-solid, minimal core that does the fundamentals exceptionally well.
- A plugin architecture that lets power users extend it in any direction.
- Every feature earns its place; nothing ships just because a competitor has it.

**One-liner:** _The VS Code of genealogy — lightweight, beautiful, and infinitely extensible._

---

## 2. Target Users

| Persona                           | Description                                                               | Primary need                                             |
| --------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Casual Curator**                | Non-technical family member who wants to record and share the family tree | Simple UI, media upload, sharing                         |
| **Serious Genealogist**           | Hobbyist/semi-pro researcher managing 1,000+ people with sources          | Source citations, GEDCOM, flexible relationships, charts |
| **Privacy-Conscious Self-Hoster** | Tech-savvy user who wants full data ownership                             | Self-hosting ease, no cloud dependency                   |
| **Developer / Integrator**        | Wants to build custom plugins, automations, or connect external tools     | API-first, plugin SDK, clean data model                  |

> [!NOTE]
> The initial build is for personal/family use. The architecture should be clean enough that it _could_ serve a broader audience later, but we're not optimising for that now.

---

## 3. Core Principles

1. **Data Ownership** — Your data lives where you choose. Self-hosted first. Full GEDCOM 7.0 import/export from day one.
2. **Simplicity** — A new user should be able to add their first family member within 60 seconds. No setup wizard, no account creation required for local use.
3. **Extensibility** — The core ships lean. Everything beyond the essentials is a plugin: charts, reports, DNA views, AI features, import sources, themes.
4. **Standards-Based** — GEDCOM 7.0 native. GEDCOM 5.5.1 import. Open data format (JSON/SQLite) alongside GEDCOM.
5. **Beautiful by Default** — Modern, responsive UI. Dark mode. Smooth animations. Looks like it was built in 2026, not 2006.
6. **Privacy-First** — Granular visibility controls. Living people hidden by default from shared views. No telemetry. No tracking. No external calls unless the user opts in.

---

## 4. Product Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                  Client (SPA)               │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Core   │ │  Plugin  │ │   Plugin     │  │
│  │   UI    │ │  Slot A  │ │   Slot B     │  │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│       └───────────┼──────────────┘           │
│              Plugin Bus (Events + API)       │
├─────────────────────────────────────────────┤
│              REST / WebSocket API           │
├─────────────────────────────────────────────┤
│                  Server Core                │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Person  │ │  Media   │ │  Plugin     │  │
│  │  Engine  │ │  Engine  │ │  Runtime    │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
├─────────────────────────────────────────────┤
│     SQLite (default) / PostgreSQL (opt)     │
│              File-based Media Store         │
└─────────────────────────────────────────────┘
```

### 4.2 Technology Stack — Deep Dive

This section explains _what_ each technology is and _why_ it was chosen. If you're not a developer, focus on the "Why it matters" column — that's the user-facing impact.

---

#### Frontend: **SvelteKit**

|                    |                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**     | SvelteKit is a modern web framework for building interactive websites. "Svelte" is the UI library (like React or Vue, but faster and simpler), and "Kit" adds routing, server-side rendering, and build tooling on top. Think of it as the complete package for building a web app — from the pages you see to how they load and navigate.                          |
| **Why not React?** | React is the most popular framework, but it ships a large "runtime" (extra code) to the browser that makes pages heavier and slower. Svelte compiles your code into plain JavaScript at build time — no runtime needed. The result: **smaller downloads, faster page loads, smoother interactions.** For a self-hosted tool that should feel instant, this matters. |
| **Why not Vue?**   | Vue is solid and simpler than React, but Svelte is even simpler. Svelte components are plain HTML/CSS/JS files with minimal boilerplate. Fewer abstractions = easier to write plugins for.                                                                                                                                                                          |
| **Why it matters** | Pages load fast. Animations are smooth. The app feels native, not like a sluggish website. Plugin developers have a gentle learning curve.                                                                                                                                                                                                                          |

---

#### Backend: **Node.js with Hono**

|                            |                                                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**             | Node.js is a JavaScript runtime — it lets you run JavaScript on the server (not just in the browser). Hono is a tiny, fast web framework that runs on Node.js, handling HTTP requests, API routes, and middleware.                                                                                                                 |
| **Why Node.js?**           | Using JavaScript on both frontend and backend means **one language for everything**. Plugin developers write one language. The npm ecosystem (millions of packages) is available for plugins. It's the most common server-side runtime in the world, so finding help, libraries, and contributors is easy.                         |
| **Why Hono specifically?** | Hono is extremely lightweight (~14KB) and one of the fastest Node.js frameworks. Unlike Express (the old standard), Hono is built for modern JavaScript with TypeScript support, edge compatibility, and middleware composition. It's fast, minimal, and stays out of your way — perfect for KISS.                                 |
| **Why not Go or Rust?**    | Both are faster at raw computation, but they'd force plugin developers to learn a second language. The plugin ecosystem would be much smaller. Node.js is "fast enough" for a family tree app — we're not processing millions of requests per second. Developer ergonomics and plugin extensibility win over raw performance here. |
| **Why it matters**         | One language everywhere. Plugins are easy to write. The server starts instantly and uses minimal resources.                                                                                                                                                                                                                        |

---

#### Language: **TypeScript**

|                    |                                                                                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**     | TypeScript is JavaScript with type annotations. Instead of `function add(a, b)` you write `function add(a: number, b: number): number`. The compiler catches mistakes before the code even runs.                                                                                       |
| **Why it matters** | For a data-heavy app like a family tree tool, types prevent entire categories of bugs ("why is this person's birth date showing as `undefined`?"). For plugin developers, TypeScript provides autocomplete and documentation built into the code — the plugin API is self-documenting. |

---

#### Database: **SQLite** (default) with PostgreSQL adapter

|                            |                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**             | SQLite is a database engine that stores everything in a single file on disk. No separate database server to install, configure, or maintain. PostgreSQL is a full-featured database server for when you need more power.                                                                                                            |
| **Why SQLite as default?** | **Zero configuration.** You run Ahnenbaum, it creates a `.db` file, done. No database server, no passwords, no ports, no Docker container for the DB. Backing up is literally copying one file. For a personal family tree with even 50,000 people, SQLite is more than capable — it powers apps with hundreds of millions of rows. |
| **Why offer PostgreSQL?**  | If someone deploys Ahnenbaum for a genealogy society with dozens of concurrent editors, PostgreSQL handles concurrent writes better. But this is a plugin/adapter — the core doesn't need it.                                                                                                                                       |
| **Why not MySQL/MariaDB?** | PostgreSQL is strictly better in every technical dimension. No reason to support MySQL.                                                                                                                                                                                                                                             |
| **Why it matters**         | Install Ahnenbaum → it works. No database setup. One file to back up, move, or restore.                                                                                                                                                                                                                                             |

---

#### ORM: **Drizzle ORM**

|                    |                                                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**     | An ORM (Object-Relational Mapper) is a library that lets you talk to the database using TypeScript code instead of writing raw SQL. Drizzle is a new, lightweight ORM that generates efficient SQL and works with both SQLite and PostgreSQL.                                |
| **Why Drizzle?**   | It's type-safe (catches DB errors at compile time), lightweight (doesn't add bloat), and supports multiple databases with the same code. Competing ORMs like Prisma are heavier and add a separate "schema language" you have to learn. Drizzle lets you stay in TypeScript. |
| **Why it matters** | Database queries are safe and fast. Switching from SQLite to PostgreSQL doesn't require rewriting code.                                                                                                                                                                      |

---

#### Real-Time: **WebSockets** (native)

|                    |                                                                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**     | WebSockets are a way for the browser and server to maintain a persistent, two-way connection. Instead of the browser asking "anything new?" every few seconds (polling), the server can push updates instantly. |
| **Why it matters** | When two family members are editing the tree at the same time, changes appear instantly for both. Plugin events (like "a new photo was uploaded") propagate in real-time.                                       |

---

#### Media Storage: **Local filesystem** (default) + S3-compatible adapter

|                      |                                                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**       | Photos, documents, and videos are stored as files on the server's disk by default. S3 is Amazon's cloud storage standard — many providers (Cloudflare R2, MinIO, Backblaze B2) are compatible.                |
| **Why local first?** | Same reason as SQLite: zero configuration. Photos go into a folder on disk. Back them up however you back up anything else. An S3 plugin is available for those who want cloud storage or have lots of media. |
| **Why it matters**   | You own your photos on your disk. No cloud required.                                                                                                                                                          |

---

#### Authentication: **Session-based** (built-in)

|                                    |                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it is**                     | When you log in, the server creates a "session" (a temporary pass) stored in a cookie. Each request includes this cookie to prove who you are. This is the simplest, most battle-tested auth mechanism on the web. |
| **Why not OAuth/OIDC by default?** | OAuth (like "Sign in with Google") requires external services. For a self-hosted family tool, a simple username/password is fine. OIDC/LDAP/SSO can be added via plugin for enterprise users.                      |
| **Why it matters**                 | No external dependencies for login. Works offline. Simple for family members.                                                                                                                                      |

---

#### Deployment: **Docker** (single container)

|                    |                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What it is**     | Docker is a tool that packages the entire app — code, dependencies, database, everything — into a single "container" that runs identically on any machine. You run one command (`docker compose up`) and the app starts. |
| **Why Docker?**    | It's the standard for self-hosted software. It eliminates "works on my machine" problems. Updates are `docker pull` + restart. Most self-hosters already have Docker.                                                    |
| **Alternative**    | For non-Docker users: `npx ahnenbaum` (downloads and runs directly via Node.js) or a standalone binary.                                                                                                                  |
| **Why it matters** | One command to run. One command to update. Works on any server, NAS, or Raspberry Pi.                                                                                                                                    |

---

#### Summary Table

| Layer         | Choice           | Key reason                                            |
| ------------- | ---------------- | ----------------------------------------------------- |
| **Frontend**  | SvelteKit        | Fastest, smallest, simplest modern framework          |
| **Backend**   | Node.js + Hono   | One language everywhere; best plugin ecosystem        |
| **Language**  | TypeScript       | Catches bugs before they happen; self-documenting API |
| **Database**  | SQLite (default) | Zero-config, single-file, backs up by copying         |
| **ORM**       | Drizzle          | Type-safe, lightweight, multi-DB                      |
| **Real-time** | WebSockets       | Instant collaboration updates                         |
| **Media**     | Local filesystem | Your files, your disk, zero cloud dependency          |
| **Auth**      | Session-based    | Simple, offline-capable, no external services         |
| **Deploy**    | Docker           | One command to run on any machine                     |

---

### 4.3 Plugin Architecture

The plugin system is the **single most important architectural decision**. Everything beyond core CRUD is a plugin.

#### Plugin Capabilities

| Capability                | Description                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------- |
| **UI Panels**             | Register custom panels/tabs on person, family, or dashboard views                   |
| **Data Extensions**       | Add custom fields/schemas to core entities via metadata                             |
| **API Routes**            | Register new API endpoints under `/api/plugins/{name}/`                             |
| **Event Hooks**           | Subscribe to lifecycle events (person.created, media.uploaded, tree.exported, etc.) |
| **Import/Export Formats** | Register custom importers/exporters (CSV, Gramps XML, etc.)                         |
| **Visualisations**        | Register custom chart/report types                                                  |
| **Themes**                | Override CSS variables and component templates                                      |
| **Background Jobs**       | Register recurring or triggered background tasks                                    |

#### Plugin Contract

Plugins are TypeScript/JavaScript modules that implement a simple interface:

```typescript
interface AhnenbaumPlugin {
  // Identity
  name: string; // e.g. "plugin-charts"
  version: string; // e.g. "1.0.0"
  description?: string; // Human-readable description

  // Lifecycle — called when plugin is loaded/unloaded
  activate(ctx: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;

  // Optional registrations — what the plugin provides
  routes?: RouteDefinition[]; // New API endpoints
  panels?: PanelDefinition[]; // UI panels to inject
  hooks?: HookRegistration[]; // Events to listen to
  schemas?: SchemaExtension[]; // Custom data fields
}
```

Plugins run in the same process as the core (no sandboxing) — this keeps things simple and fast. Since this is for personal/family use, the trust model is: **only install plugins you trust**, same as VS Code extensions.

#### First-Party Plugins (Shipped but Optional)

| Plugin                | Description                                             | Priority             |
| --------------------- | ------------------------------------------------------- | -------------------- |
| `plugin-charts`       | Pedigree, fan, descendancy, hourglass charts            | P0 — ships with core |
| `plugin-gedcom`       | GEDCOM 7.0 + 5.5.1 import/export                        | P0 — ships with core |
| `plugin-reports`      | Family book PDF, ancestor report, statistics            | P1                   |
| `plugin-stories`      | Narrative/biography editor per person                   | P1                   |
| `plugin-sharing`      | Invite-link based sharing with configurable permissions | P1                   |
| `plugin-timeline`     | Visual timeline of family events                        | P2                   |
| `plugin-maps`         | Geographic visualisation of family migrations           | P2                   |
| `plugin-ai-narrator`  | AI-generated family narratives from data                | P3                   |
| `plugin-dna`          | DNA kit data import and relationship matching           | P3                   |
| `plugin-record-hints` | Integration with open record databases                  | P3                   |

---

### 4.4 Developer Workflow & LLM-Collaborative Architecture

> [!IMPORTANT]
> This project is built by **two developers using LLMs as their primary coding tool**. Every architectural decision below exists to make LLM-generated code reliable and to prevent two people from stepping on each other's work.

#### Monorepo Structure

The codebase is a monorepo using **npm workspaces**. Each package is an isolated unit with its own types, source, and tests. Two developers can work on separate packages with **zero file overlap**.

```
ahnenbaum/
├── packages/
│   ├── core/                  ← Shared types, data model, plugin API
│   │   └── src/
│   │       ├── models/         ← Person, Relationship, Media, Event types
│   │       ├── plugin-api/     ← PluginContext, hook definitions, panel slots
│   │       └── i18n/           ← Message files (en.json, de.json)
│   ├── server/                 ← Hono API server, DB layer, auth
│   │   └── src/
│   │       ├── routes/          ← API route handlers (persons, media, search)
│   │       ├── db/              ← Drizzle schema, migrations, queries
│   │       ├── services/        ← Business logic (person-service, media-service)
│   │       └── plugin-runtime/  ← Server-side plugin loader
│   ├── client/                  ← SvelteKit frontend (follows SvelteKit conventions)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── components/   ← Reusable UI components
│   │       │   ├── stores/       ← Svelte stores for state management
│   │       │   └── plugin-slots/ ← UI injection points for plugins
│   │       └── routes/           ← SvelteKit pages/routes
│   └── plugins/
│       ├── charts/              ← plugin-charts (first-party)
│       └── gedcom/              ← plugin-gedcom (first-party)
├── ARCHITECTURE.md              ← Always-current map of what lives where
├── CONVENTIONS.md               ← Code rules for developers and LLMs
├── .agent/                      ← Shared LLM agent rules, lessons, context
│   └── rules/
└── docker-compose.yml
```

**The key rule:** Developer A works in `packages/server/` while Developer B works in `packages/client/`. They share contracts via `packages/core/` — which is touched rarely and carefully.

#### Development Principles for LLM-Assisted Coding

| Principle                      | Rule                                                                          | Why it matters for LLMs                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Contract-first**             | Define TypeScript interfaces in `packages/core/` _before_ implementing them   | LLMs are excellent at implementing against a defined interface, but terrible at guessing undocumented APIs      |
| **Strict module boundaries**   | Each package exports via `index.ts` barrel files. Internals are private       | An LLM generating server code can't accidentally break client code — they only interact through typed contracts |
| **One feature = one branch**   | Never two people on the same branch. Feature branches with small, focused PRs | LLMs generate cleaner code when the diff scope is small                                                         |
| **Thin files**                 | Target ~300 lines per file. Split when growing beyond that                    | LLMs lose accuracy on files > 500 lines. Small files = more precise edits = fewer bugs                          |
| **Tests as safety nets**       | Every module's public API has tests (Vitest)                                  | When Developer A changes a module, tests tell them (and their LLM) if they broke Developer B's dependency       |
| **Shared `.agent/` directory** | Both developers' LLM agents load the same rules and context                   | Keeps both agents aligned on conventions, naming, and architecture decisions                                    |

#### Code Conventions

These rules live in `CONVENTIONS.md` at the repo root. Both developers (and their LLMs) follow them:

| Convention                   | Rule                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Formatting**               | Prettier with shared config — auto-formatted on save, LLMs don't worry about style                  |
| **Linting**                  | ESLint with strict TypeScript rules — catches LLM mistakes before commit                            |
| **File naming**              | `kebab-case` for all files (e.g. `person-service.ts`, `media-upload.svelte`)                        |
| **Component naming**         | `PascalCase` for Svelte components (e.g. `PersonCard.svelte`)                                       |
| **Function/variable naming** | `camelCase` (e.g. `getPersonById`, `mediaStore`)                                                    |
| **Imports**                  | Absolute imports via path aliases: `@core/`, `@server/`, `@client/` — avoids fragile relative paths |
| **Error handling**           | Result types (`{ ok: true, data }                                                                   | { ok: false, error }`) over thrown exceptions — LLMs handle explicit returns better than try/catch |
| **No hardcoded strings**     | All user-facing text goes through the i18n system                                                   |
| **Testing**                  | Vitest for all packages — SvelteKit's default, fast, TypeScript-native                              |

#### Database Migration Strategy

Two developers touching the database schema simultaneously will break things without rules:

| Rule                                       | Detail                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Migrations are **generated**               | Use `drizzle-kit generate` — never hand-write migration SQL                                                                                |
| One migration per feature branch           | Each branch creates its own migration file                                                                                                 |
| Migrations are sequential                  | Merged in timestamp order; conflicts caught at PR merge time                                                                               |
| Shared seed data                           | A `seed.ts` script creates a test family (10-20 people with relationships, media, events) so both developers work with identical test data |
| Schema changes go through `packages/core/` | Any data model change updates the shared types first, then the Drizzle schema — contract-first                                             |

#### CI Pipeline (GitHub Actions)

Every PR must pass before merge — this is the automated safety net for LLM-generated code:

| Step        | What it checks                                                       |
| ----------- | -------------------------------------------------------------------- |
| `lint`      | ESLint + Prettier — catches style and type issues                    |
| `typecheck` | `tsc --noEmit` — ensures all types resolve correctly across packages |
| `test`      | `vitest run` — all tests pass                                        |
| `build`     | Full production build succeeds                                       |

---

## 5. Core Features (The "Solid Base")

These are the non-negotiable features that ship in the core — no plugins required.

### 5.1 Person Management

| Requirement        | Detail                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Create/edit person | Name (given, surname, maiden, nicknames), sex/gender, birth, death, burial                                                       |
| Multiple names     | Support for name changes, married names, aliases                                                                                 |
| Fact/event system  | Extensible event types: birth, death, marriage, baptism, immigration, occupation, residence, military service, education, custom |
| Date handling      | Exact dates, approximate (~), ranges (between/and), before/after, BC dates                                                       |
| Place handling     | Hierarchical places (City → County → State → Country) with optional coordinates                                                  |
| Notes              | Rich text notes per person and per event/fact                                                                                    |
| Source citations   | Source → Citation → Fact chain — proper genealogical evidence model                                                              |
| Unique IDs         | Each person gets a stable UUID; GEDCOM XREF mapping on import                                                                    |

### 5.2 Relationship Engine

> [!IMPORTANT]
> This is a key differentiator. Model relationships **flexibly** — not just the rigid GEDCOM family model.

| Requirement            | Detail                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Core relationships     | Biological parent, spouse/partner                                                   |
| Extended relationships | Adoptive parent, step-parent, foster parent, guardian, godparent                    |
| Relationship types     | Marriage, civil partnership, domestic partnership, cohabitation, engagement, custom |
| Same-sex support       | First-class; no gendered assumptions in the data model                              |
| Relationship metadata  | Start date, end date, place, notes, sources                                         |
| Multiple families      | A person can belong to multiple family units (child of, partner in)                 |

**Data model approach:** Use a typed edge graph rather than GEDCOM's rigid "Family" container. Each relationship is a first-class entity: `(PersonA) —[type, metadata]→ (PersonB)`.

### 5.3 Media Management

| Requirement     | Detail                                                                |
| --------------- | --------------------------------------------------------------------- |
| Supported types | Images (JPEG, PNG, WebP, HEIC), PDF, video, audio                     |
| Upload UX       | Drag-and-drop, multi-file, paste from clipboard                       |
| Linking         | Media can be linked to: persons, events/facts, relationships, sources |
| Gallery views   | Per-person gallery, global media gallery, timeline-sorted view        |
| Thumbnails      | Auto-generated thumbnails for all media types                         |
| Storage         | Local filesystem default; S3-compatible via plugin                    |
| Metadata        | Caption, date, place, description, original filename                  |
| EXIF            | Auto-extract date/location from photo EXIF data                       |

### 5.4 Tree Visualisation (Core)

The core ships with a simple, interactive pedigree/ancestor view. Rich charts are plugins.

| Requirement      | Detail                                                  |
| ---------------- | ------------------------------------------------------- |
| Interactive tree | Pan, zoom, click-to-navigate, expand/collapse branches  |
| Default view     | 4-generation ancestor chart centered on selected person |
| Person cards     | Photo thumbnail, name, birth/death years, quick-edit    |
| Responsive       | Works well on desktop; sensible layout on tablets       |
| Performance      | Must handle 10,000+ person trees without degradation    |

### 5.5 Search & Navigation

| Requirement        | Detail                                                    |
| ------------------ | --------------------------------------------------------- |
| Global search      | Fuzzy search across names, places, notes, dates           |
| Filters            | By surname, date range, place, event type, media presence |
| Keyboard shortcuts | Power-user navigation (Cmd+K / Ctrl+K command palette)    |
| Breadcrumbs        | Always show path to current person for orientation        |

### 5.6 Data Import / Export (Core)

| Requirement         | Detail                                              |
| ------------------- | --------------------------------------------------- |
| GEDCOM 7.0 import   | Full support including multimedia references        |
| GEDCOM 5.5.1 import | Legacy support for migration from any existing tool |
| GEDCOM 7.0 export   | Including media packaging (`.gedz`)                 |
| Native format       | JSON-based backup/restore for lossless round-trip   |
| Media export        | Bundled media export alongside structured data      |

### 5.7 Multi-Language Support (i18n)

> [!IMPORTANT]
> All code, comments, variable names, and git commits are in **English**. But the UI that family members see must be switchable to **German** (or any future language) at any time.

**How it works:** Every piece of text the user sees ("Add Person", "Birth Date", "Search…") is never hardcoded in the code. Instead, each string is a key that looks up the actual text from a language file. Switching language swaps which file is used — instantly, no reload.

**Implementation: Paraglide.js** (by Inlang) — the modern standard for SvelteKit i18n:

- One JSON file per language: `en.json`, `de.json`, etc.
- Compile-time: unused translations are stripped out, keeping the app fast
- Type-safe: if a translation key is missing, the build fails (no broken UI)
- Tiny: adds essentially zero overhead to the app

**Example of how language files look:**

```json
// messages/en.json
{
  "person_add": "Add Person",
  "person_birth": "Birth Date",
  "search_placeholder": "Search people, places, notes…"
}

// messages/de.json
{
  "person_add": "Person hinzufügen",
  "person_birth": "Geburtsdatum",
  "search_placeholder": "Personen, Orte, Notizen suchen…"
}
```

| Requirement            | Detail                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| i18n framework         | Paraglide.js — all UI strings externalised from day one                                      |
| Default languages      | English + German, both shipping with the app                                                 |
| Language switcher      | User-facing toggle in the UI (e.g. header/settings) to switch language on the fly, no reload |
| Per-user preference    | Selected language saved per user/browser; persists across sessions                           |
| Developer rule         | **No hardcoded user-facing strings in code** — everything goes through the i18n system       |
| Community translations | Additional languages addable by dropping a new JSON file (e.g. `fr.json`)                    |
| RTL                    | Right-to-left layout support in the CSS framework for future languages (Arabic, Hebrew)      |

### 5.8 Authentication & Access Control

| Requirement          | Detail                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Single-user mode     | No login required; ideal for personal local use                                                    |
| Multi-user mode      | Username/password auth with role-based access                                                      |
| Roles                | Owner, Editor, Viewer                                                                              |
| Privacy controls     | Per-person visibility (public, users-only, owner-only); living people auto-hidden from Viewer role |
| Plugin extensibility | OIDC / LDAP / SSO available via auth plugins later                                                 |

### 5.9 Deployment & Operations

| Requirement  | Detail                                                  |
| ------------ | ------------------------------------------------------- |
| Docker       | Single container, `docker compose up` to run            |
| Bare metal   | `npx ahnenbaum` or single binary for non-Docker users   |
| Auto-backup  | Configurable automated local backups (SQLite snapshots) |
| Health check | `/health` endpoint for monitoring                       |
| Logging      | Structured JSON logs, configurable verbosity            |
| Updates      | In-app update notification; one-command upgrade         |

---

## 6. Non-Functional Requirements

| Category            | Requirement                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**     | First page load < 1.5s. Tree rendering of 10K persons < 3s. API responses < 200ms.                                                          |
| **Bundle size**     | Core JavaScript bundle < 200KB compressed (excluding plugins).                                                                              |
| **Accessibility**   | Keyboard navigable. Sufficient colour contrast. Semantic HTML.                                                                              |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge.                                                                                         |
| **Responsive**      | Desktop-first, but usable on tablets. No native mobile app.                                                                                 |
| **Security**        | Input validation on all user data. Parameterised database queries (prevents SQL injection). Rate limiting on login. Secure session cookies. |
| **Data integrity**  | Foreign key constraints. Soft-delete with trash / undo support.                                                                             |

---

## 7. What We Deliberately Do NOT Build in Core

These are **out of scope for core** and should only exist as plugins (if ever):

| Feature                                    | Reason                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| DNA integration                            | Complex, niche, requires external services                  |
| Record hint matching                       | Requires external API integrations                          |
| AI features (narration, photo enhancement) | Optional, requires external services                        |
| Social features (comments, likes, feed)    | Adds complexity; plugin territory                           |
| Print-quality family book generation       | Specialised; plugin                                         |
| Native mobile apps                         | Webapp is sufficient; responsive design covers tablets      |
| Offline-first / CRDT sync                  | Significant complexity; not needed for initial personal use |

---

## 8. Competitive Positioning

```
                    Simple ──────────────────── Powerful
                    │                              │
  Cloud-hosted  ────┤  Ancestry    MyHeritage       │
                    │  FamilySearch                 │
                    │                              │
                    │                              │
                    │          ┌─────────┐         │
  Self-hosted   ────┤          │AHNENBAUM│         │
                    │          └─────────┘         │
                    │                              │
                    │  Genea.app   Gramps  webtrees │
                    │              Gramps Web       │
                    │                              │
```

**Ahnenbaum sits in the underserved quadrant: self-hosted, beautiful, simple by default, powerful via plugins.**

| vs. Competitor            | Ahnenbaum advantage                                 |
| ------------------------- | --------------------------------------------------- |
| vs. Ancestry / MyHeritage | Free, self-hosted, no lock-in, privacy-first        |
| vs. webtrees              | Modern UI, plugin architecture, better DX, not PHP  |
| vs. Gramps / Gramps Web   | Web-native, beautiful, far easier to deploy and use |
| vs. FamilySearch          | Self-hosted, private, no shared-tree data conflicts |
| vs. RootsMagic / FTM      | Web-based, collaborative, cross-platform, free      |

---

## 9. Release Strategy

### Phase 1 — Foundation (MVP)

> Goal: A usable, beautiful family tree app you can self-host.

- [ ] Monorepo setup (`packages/core`, `packages/server`, `packages/client`, `packages/plugins`)
- [ ] `ARCHITECTURE.md` and `CONVENTIONS.md` in repo root
- [ ] `.agent/` directory with shared LLM rules
- [ ] CI pipeline (lint, typecheck, test, build)
- [ ] Person CRUD with full fact/event system
- [ ] Flexible relationship engine
- [ ] Media upload and linking
- [ ] Interactive tree view (4-gen pedigree)
- [ ] Global search
- [ ] GEDCOM 7.0 + 5.5.1 import/export
- [ ] Single-user auth mode
- [ ] Docker deployment
- [ ] Plugin runtime (load/unload plugins, event bus, panel slots)
- [ ] `plugin-charts` (pedigree, fan chart)
- [ ] `plugin-gedcom` (bundled)
- [ ] English + German i18n
- [ ] Dark mode
- [ ] Database seed script (`seed.ts`)

### Phase 2 — Collaborate

> Goal: Family members can work together on the tree.

- [ ] Multi-user auth with roles
- [ ] Granular privacy controls
- [ ] `plugin-sharing` (invite links)
- [ ] `plugin-reports` (PDF family book, ancestors report)
- [ ] `plugin-stories` (per-person narrative editor)
- [ ] Plugin registry / marketplace concept

### Phase 3 — Enrich

> Goal: Power user and storytelling features.

- [ ] `plugin-timeline` (visual family timeline)
- [ ] `plugin-maps` (migration visualisation)
- [ ] `plugin-ai-narrator` (AI family stories)
- [ ] `plugin-dna` (DNA data import)
- [ ] `plugin-record-hints` (open record DB integration)
- [ ] Community plugin SDK documentation

---

## 10. Success Metrics

Since this starts as a personal/family project, metrics are practical rather than vanity-driven:

| Metric                               | Target                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| Family members using the app         | At least 5 family members actively contributing                  |
| Persons in tree                      | First tree exceeds 200 people                                    |
| GEDCOM import success rate           | > 95% (tested against exports from Ancestry, MyHeritage, Gramps) |
| Time to add a person                 | < 60 seconds for basic entry                                     |
| Page load time                       | < 1.5 seconds on first visit                                     |
| Data loss incidents                  | 0                                                                |
| "I can figure this out without help" | Non-technical family members can navigate and add data           |

---

## 11. Decisions Log

| #   | Question             | Decision                                             | Rationale                                                                                                     |
| --- | -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Frontend framework   | **SvelteKit**                                        | See Section 4.2 — fastest, smallest, simplest modern framework                                                |
| 2   | Backend runtime      | **Node.js + Hono**                                   | One language everywhere; best plugin ecosystem; fast enough                                                   |
| 3   | Database             | **SQLite** (default)                                 | Zero-config; single file; PostgreSQL adapter available later                                                  |
| 4   | Plugin sandboxing    | **No**                                               | Unnecessary complexity for personal use; trust model = only install what you trust                            |
| 5   | Licensing            | **MIT** (tentative)                                  | Maximum permissiveness for a personal project; can revisit if it grows                                        |
| 6   | Mobile strategy      | **Responsive webapp only**                           | No native mobile apps; responsive design is sufficient                                                        |
| 7   | Offline-first / CRDT | **Not in scope**                                     | Significant complexity; revisit only if real need emerges                                                     |
| 8   | Development model    | **Monorepo + contract-first + LLM-collaborative**    | Two developers with LLMs working in parallel; packages isolate work areas; shared contracts prevent conflicts |
| 9   | Testing framework    | **Vitest**                                           | SvelteKit default; fast; TypeScript-native                                                                    |
| 10  | CI                   | **GitHub Actions** (lint → typecheck → test → build) | Automated safety net — every PR validated before merge                                                        |

---

## 12. Glossary

| Term           | Definition                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------- |
| **GEDCOM**     | GEnealogical Data COMmunication — the universal interchange format for family tree data     |
| **GEDZ**       | GEDCOM 7.0 zip package including media files                                                |
| **SPA**        | Single Page Application — a web app that loads once and navigates without full page reloads |
| **SvelteKit**  | The web framework used for the frontend (see Section 4.2)                                   |
| **TypeScript** | JavaScript with type annotations for catching bugs early                                    |
| **SQLite**     | A lightweight database stored as a single file                                              |
| **Docker**     | A tool that packages apps into portable containers that run anywhere                        |
| **ORM**        | Object-Relational Mapper — translates between code objects and database tables              |
| **Plugin Bus** | Internal event system for plugin-to-core and plugin-to-plugin communication                 |
| **XREF**       | Cross-reference identifier used in GEDCOM files to link records                             |
| **i18n**       | Internationalisation — supporting multiple languages in the UI                              |

---

_This document is a living artifact. Update it as development progresses and priorities evolve._
