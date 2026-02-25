---
description: Code quality review workflow for the Ahnenbaum monorepo
---

# /clean Workflow

Systematic code quality review focused on **bugs, style, efficiency, elegance, and refactoring** for the Ahnenbaum TypeScript monorepo.

> [!TIP]
> For strategic improvements (new features, roadmap items), use `/analyze` instead.

---

## Skills Reference

Before starting, **load relevant skills** from `.agent/skills/` based on the files being reviewed:

**Usage:** View the skill's `SKILL.md` file before reviewing related code:
```
view_file .agent/skills/<skill-name>/SKILL.md
```

> [!IMPORTANT]
> Always check `skill-index` first to identify all applicable skills for the review scope.

---

## Output Format

```markdown
# Code Review Report
Generated: [DATE]
Scope: [recent changes / full codebase]

## 🔴 Critical (Fix Immediately)
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|

## 🟡 Should Fix (Before Merge)
| File:Line | Issue | Suggested Fix |
|-----------|-------|---------------|

## 🟢 Suggestions
- Items...

## 🔧 Refactoring & Extraction Opportunities
| File | Opportunity | Rationale |
|------|-------------|-----------|

## ✅ Strengths
- What's working well

## Summary
Files: X | Issues: Y critical, Z medium | Status: [PASS/NEEDS WORK]
```

---

## Steps

### 1. Setup

```bash
# Run linter
// turbo
npm run lint
```

```bash
# Run tests to verify functionality
// turbo
npm run test
```

Identify focus area:
- User-specified files, OR
- Recent git changes: `git diff --name-only HEAD~5`
- High-complexity files: `packages/core/src/`, `packages/server/src/`, `packages/client/src/`

---

### 2. Quality Scans

#### Anti-Patterns
```bash
# Empty catch blocks (silent failures)
grep -rn "catch.*{" packages/ --include="*.ts" -A1 | grep -E "^\s*}$|^\s*$" | head -10

# Unused eslint-disable comments
grep -rn "eslint-disable" packages/ --include="*.ts"

# TODO/FIXME/HACK markers
grep -rn "TODO\|FIXME\|HACK\|XXX" packages/ --include="*.ts"

# Console.log statements (should be removed in prod)
grep -rn "console\.\(log\|debug\|info\)" packages/ --include="*.ts" | head -10
```

#### Style Issues
```bash
# Any type usage (avoid in TypeScript)
grep -rn ": any" packages/ --include="*.ts" | head -10

# Non-null assertions (risky)
grep -rn "!" packages/ --include="*.ts" | grep -E "\w+![\.\[]" | head -10

# Magic numbers
grep -rEn "[^0-9][0-9]{3,}[^0-9]" packages/ --include="*.ts" | grep -v "line\|L[0-9]\|import\|from" | head -10
```

#### Code Duplication
```bash
# Check for code duplication using jscpd (ad-hoc)
// turbo
npx jscpd packages/ --threshold 5 --min-lines 5 --min-tokens 50
```

#### Dead Code & Unused Exports

Review knip output (if configured) or manually check:
1. Unused dependencies (remove from `package.json`)
2. Unused exports in barrel files (`index.ts`) — remove re-exports
3. Unused exported types — remove or un-export
4. Unused files — delete or un-export

---

### 3. Refactoring & Extraction Analysis

Apply these heuristics to the focus files and any files flagged in Step 2:

| Signal | Threshold | Action |
|--------|-----------|--------|
| File length | >300 lines | Split into focused modules |
| Function length | >50 lines | Extract helper functions |
| Parameter count | >4 params | Introduce options object or split |
| Nesting depth | >3 levels | Extract early returns or helpers |
| Mixed concerns | Multiple responsibilities in one file | Extract into separate modules |
| Repeated patterns | 3+ occurrences | Extract shared utility |

**Elegance check — ask for each file:**
1. Would a new team member understand this in <5 minutes?
2. Is there a simpler way to achieve the same result?
3. Can any imperative code become declarative?
4. Are naming conventions clear and consistent?

---

### 4. Deep Review

Focus on core packages:

**Core (`packages/core/src/`):**
- Domain models, schemas, validation
- Shared types and interfaces

**Server (`packages/server/src/`):**
- Hono routes, API endpoints
- Database operations, middleware

**Client (`packages/client/src/`):**
- UI components, state management
- SvelteKit specifics

Check for:
- Memory leaks in event listeners
- Unhandled edge cases
- Security: input validation, SQL injection prevention
- **Elegance**: Overly complex conditional chains, verbose patterns with simpler alternatives
- **Optimization**: Hot paths with unnecessary work
- **Extraction**: Logic that would be cleaner as a standalone utility or module

---

### 5. Test Coverage

```bash
# Run with coverage
// turbo
npm run test -- --coverage
```

Flag untested:
- New modules added since last review
- Error handling paths
- Edge cases
- Utility functions

---

### 6. Generate Report

Save to `REVIEW_CLEAN.md` in project root (gitignored)

---

## Severity Guide

| Level | Criteria | Action |
|-------|----------|--------|
| 🔴 Critical | Bugs, security, data loss, memory leaks | Fix immediately |
| 🟡 Medium | Style, `any` types, missing tests, tech debt | Fix before merge |
| 🟢 Low | Suggestions, minor polish | Nice-to-have |
| 🔧 Refactor | Extraction, simplification, elegance | Track as issue or fix inline |
