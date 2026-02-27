---
description: Self-review checklist for implementation plans, feature specs, PRDs, design documents, and GitHub issues before presenting to user
---

# /review Workflow

Catch gaps, risks, and ambiguities in any planning document **before** presenting it to the user. Run this after drafting but before `notify_user`.

> [!TIP]
> Works on implementation plans, feature specs, PRDs, design docs, and GitHub issues.
> For code quality, use `/clean`.

---

## Steps

### 1. Identify the Document

If no path was given, use the most recently created/edited artifact (usually `implementation_plan.md`).

---

### 2. Completeness Check

Verify the document covers all mandatory sections. Check items relevant to the document type:

| Check | Implementation Plans | Feature Specs | GitHub Issues |
|-------|:---:|:---:|:---:|
| Problem statement / goal | ✅ | ✅ | ✅ |
| Proposed changes (file-level) | ✅ | — | — |
| File links with `[MODIFY]`/`[NEW]`/`[DELETE]` | ✅ | — | — |
| Acceptance criteria | — | ✅ | ✅ |
| Edge cases documented | ✅ | ✅ | ✅ |
| Verification plan (automated + manual) | ✅ | ✅ | — |
| User Review Required section (if breaking/risky) | ✅ | ✅ | — |
| Secrets / env vars documented | ✅ | — | — |
| Rollback / backwards compat noted | ✅ | — | — |

---

### 3. Technical Accuracy

For each proposed change, verify against the actual codebase:

- [ ] **File paths exist** — every linked file resolves (or is marked `[NEW]`)
- [ ] **Function signatures match** — referenced functions/methods actually exist with the stated signatures
- [ ] **Dependencies checked** — imports, packages, config keys referenced are real
- [ ] **No stale references** — code snippets aren't from an outdated version of the file
- [ ] **Test commands work** — `npx vitest run ...` paths are valid

Use `grep_search`, `view_file_outline`, and `view_code_item` to spot-check at least 3 claims.

---

### 4. Optimality & Forward Compatibility

Before proceeding, challenge the core approach:

- [ ] **Is this the simplest solution?** — Could the same result be achieved with fewer moving parts (fewer files, endpoints, abstractions)?
- [ ] **Are there alternative approaches?** — List at least 2 alternatives and briefly justify why the chosen approach wins
- [ ] **Shared constants vs duplication** — Are any magic strings, enum values, or config duplicated across packages? Should they be in a shared core?
- [ ] **Forward compatibility** — If a new variant/type is added to the domain model, does this change degrade gracefully or require shotgun surgery?
- [ ] **API contract stability** — Does this change existing return types or add new endpoints? New endpoints are preferred over modifying existing ones

If the answer to any check is no, revise the plan before proceeding.

---

### 5. Risk & Edge Case Scan

Ask yourself these questions:

1. **What breaks if this fails silently?** (network errors, missing secrets, timeout)
2. **What breaks if this succeeds but behaves differently than expected?** (wrong types, race conditions, stale cache)
3. **Does dev mode still work?** (local vs prod environment differences)
4. **Does this interact with existing caching?** (CDN, edge cache, in-memory cache, browser cache)
5. **Are there security implications?** (new endpoints, auth bypass, token leakage)
6. **Is the change backwards compatible?** Can it be deployed incrementally?

---

### 6. Clarity & Actionability

- [ ] Someone unfamiliar with the codebase could implement this from the plan alone
- [ ] No vague language ("maybe", "if needed", "consider") — replace with decisions
- [ ] Every `[MODIFY]` section says *what* changes, not just *that* something changes
- [ ] Secrets/env vars have clear names, locations, and setup instructions
- [ ] Verification steps are copy-paste runnable

---

### 7. Produce Findings Table

Append a `## Self-Review Findings` section to the document:

```markdown
## Self-Review Findings

| # | Finding | Resolution |
|---|---------|------------|
| 1 | [what was wrong or missing] | [how it was fixed in the plan] |
| 2 | ... | ... |
```

If no issues found, append:

```markdown
## Self-Review Findings

✅ No issues found — plan passed all checks.
```

---

### 8. Update the Plan

Apply all fixes inline in the document. Don't just list findings — actually fix the plan text.

---

## Anti-Patterns

❌ **Rubber-stamping** — "Looks good" without checking anything
❌ **Excessive nitpicking** — flagging style preferences as issues
❌ **Checking only happy path** — skipping error/edge case analysis
❌ **Ignoring dev mode** — plan works in prod but breaks local development
