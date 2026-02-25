---
description: Systematic code quality review focused on bugs, style, and efficiency
---

# /clean — Code Quality Review

Run a structured code-quality pass on the current changeset or a specified scope.

## Steps

1. **Identify scope** — determine files to review:
   - If the user specifies files/directories, use those.
   - Otherwise, use `git diff --name-only HEAD` to get recently changed files.

2. **Lint & format check**
   // turbo
   ```bash
   npm run lint 2>&1 | head -80
   ```

3. **Type check**
   // turbo
   ```bash
   npm run build 2>&1 | head -80
   ```

4. **Manual review pass** — for each file in scope, check:
   - [ ] **Bugs**: off-by-one errors, null/undefined access, race conditions
   - [ ] **Style**: naming conventions, consistent patterns, dead code
   - [ ] **Efficiency**: unnecessary re-renders, N+1 queries, redundant allocations
   - [ ] **Security**: unsanitised input, exposed secrets, injection vectors
   - [ ] **Types**: `any` usage, missing return types on public APIs

5. **Report findings** — present a ranked list:
   - 🔴 **Critical** — bugs or security issues
   - 🟡 **Warning** — style or efficiency concerns
   - 🟢 **Nit** — minor improvements

6. **Fix or propose** — for each finding:
   - If the fix is obvious and safe, apply it directly.
   - Otherwise, describe the issue and suggest a solution for user approval.
