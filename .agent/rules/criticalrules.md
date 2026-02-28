# Critical Rules

> Hard guardrails to prevent repeated mistakes.
> Each rule should reference the lesson that spawned it.

## 1. Near-100% Test Coverage is Non-Negotiable

- Every new module, function, and code path **must** ship with tests. Target as close to 100% coverage as is feasible for both LLM-generated and human-written code.
- If a piece of code is genuinely untestable (e.g., thin glue around third-party I/O), document **why** with a `// coverage:skip — <reason>` comment. These exceptions must be rare.
- Before marking any task complete, ask: *"Is every meaningful branch and edge case covered by a test?"* If the answer is no, write the missing tests first.

## 2. Tests Must Stay in Sync with Code

- **Every** code change that alters behaviour must include corresponding test updates in the same commit/PR. No exceptions.
- When refactoring, run the full test suite **before** and **after**. If a test breaks, fix it immediately — never delete or skip a test to make CI green.
- New features require: unit tests for logic, integration tests for cross-module interactions, and (where applicable) E2E smoke tests.

## 3. Monitor for Coverage Drift

- After completing work, run `npx vitest run --coverage` (or the project-equivalent) and compare against the previous baseline.
- Coverage must **never decrease** without an explicit, documented justification.
- If coverage drops, treat it as a blocker — write the missing tests before proceeding.
- Periodically audit uncovered lines (`istanbul` / `v8` reports) and file issues for any gaps that have crept in.

## 4. Contract-First Development

- All shared types and interfaces **must** be defined in `@ahnenbaum/core` before implementing them in server or client.
- When adding a new API endpoint, define the request/response types in `packages/core/src/types.ts` (or a new file in `models/`) first, then implement the handler.
- Export new types from the barrel file (`packages/core/src/index.ts`) before importing them elsewhere.
- This rule ensures both developers (and their LLMs) work against stable, typed contracts.

## 5. Module Boundaries

- **Never** import between `@ahnenbaum/server` and `@ahnenbaum/client` directly.
- All shared types, constants, and utilities go through `@ahnenbaum/core`.
- Within a package, import via relative paths. Across packages, import via the workspace package name (`@ahnenbaum/core`).
- If you need something from another package that isn't exported, add it to that package's barrel file — don't reach into internal files.

## 6. File Size Guard

- Target **~300 lines** per file. Flag any file exceeding this limit during code review.
- LLMs lose accuracy on files > 500 lines. Smaller files produce more precise edits and fewer bugs.
- When a file grows beyond 300 lines, split it into focused modules with clear responsibilities.

## 7. i18n Enforcement

- **No hardcoded user-facing strings in code.** Every piece of text the user sees must go through the i18n system (Paraglide.js).
- This applies to: labels, buttons, error messages, tooltips, placeholders, and any other UI text.
- This does **not** apply to: log messages, developer-facing error strings, or test fixtures.
- Language files are in `packages/core/src/i18n/`. Keys use `snake_case` with dot-separated namespaces.

## 8. Zero Warnings Policy

- **`svelte-check` must produce 0 errors AND 0 warnings before committing.** CI exits with code 2 on warnings, so any warning = CI failure.
- Never dismiss a warning as "pre-existing" or "not from our changes". If it's in the output, it's our problem.
- If a warning can't be fixed (rare), suppress it with an inline `<!-- svelte-ignore -->` comment and document why.

