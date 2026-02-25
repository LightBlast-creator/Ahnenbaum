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
