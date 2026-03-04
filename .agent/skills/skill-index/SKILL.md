---
name: skill-index
description: Master index of all available agent skills. ALWAYS consult this first before starting any task to identify relevant skills. Triggers on any development task, coding request, or when planning implementation.
---

# Skill Index (Metaskill)

**ALWAYS consult this index at the start of any task** to identify which specialized skills to load for optimal assistance.

---

## Quick Reference by Domain

### 🌳 Family Tree & Domain
| Skill | Use When |
|-------|----------|
| `genealogy` | Data modeling, GEDCOM, dates, evidence, relationships, domain logic |

### 🎨 Frontend & UI (SvelteKit)
| Skill | Use When |
|-------|----------|
| `sveltekit` | Routing, load functions, form actions, hooks, adapters, SSR |

### ⚙️ Backend & APIs (Hono)
| Skill | Use When |
|-------|----------|
| `hono-routing` | Hono routes, middleware, validation (Zod/Valibot), RPC, error handling |

### 🗄️ Database (Drizzle + SQLite)
| Skill | Use When |
|-------|----------|
| `drizzle` | Drizzle queries, CRUD, schema definitions, migrations, custom types |

### 🧪 Testing & Quality
| Skill | Use When |
|-------|----------|
| `vitest-testing` | Vitest unit/integration tests, mocking, ESM support, coverage |

### 🚀 CI/CD & Deployment
| Skill | Use When |
|-------|----------|
| `github-actions-ci` | GitHub Actions workflows, lint/test/build pipelines, preview deploys |

### 📦 Monorepo & Tooling
| Skill | Use When |
|-------|----------|
| `npm-workspaces` | npm workspaces, package deps, build ordering, cross-package development |

### 🛠️ Skill Development
| Skill | Use When |
|-------|---------|
| `skill-creator` | Create new skills, improve existing skills, run evals, benchmark skills |

### 🔍 Discovery
| Skill | Use When |
|-------|----------|
| `skillsmp-search` | Find new skills, marketplace search, best practices |

---

## Decision Tree

```
Starting a task?
│
├─ UI components / SvelteKit? → Load: sveltekit
│
├─ State management? → Load: sveltekit (Svelte 5 runes/stores)
│
├─ Backend API (Hono)? → Load: hono-routing
│
├─ Database (SQLite / Drizzle)? → Load: drizzle
│
├─ Writing tests? → Load: vitest-testing
│
├─ CI/CD / GitHub Actions? → Load: github-actions-ci
│
├─ Monorepo / workspaces? → Load: npm-workspaces
│
├─ Auth / GEDCOM / genealogy? → Load: genealogy
│
├─ Creating or improving a skill? → Load: skill-creator
│
└─ Need new capability? → Load: skillsmp-search
```

---

## How to Use

1. **Read this index** at the start of each task
2. **Identify relevant skills** from the tables above
3. **Load skills** using: `view_file .agent/skills/<skill-name>/SKILL.md`
4. **If no skill exists**, use `skillsmp-search` to find and install one
5. **Follow skill instructions** exactly as documented

---

## Adding New Skills

When installing a new skill via `skillsmp-search`:

1. Download to `.agent/skills/<skill-name>/SKILL.md`
2. Update this index file with the new entry in the appropriate domain table
3. Commit both files together
