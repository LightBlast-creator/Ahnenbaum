---
name: skill-index
description: Master index of all available agent skills. ALWAYS consult this first before starting any task to identify relevant skills. Triggers on any development task, coding request, or when planning implementation.
always-load: true
---

# Skill Index (Metaskill)

**ALWAYS consult this index at the start of any task** to identify which specialized skills to load for optimal assistance.

---

## Quick Reference by Domain

### 🌳 Family Tree & Domain
| Skill | Use When |
|-------|----------|
| *(none yet)* | *Install via `skillsmp-search` as needed* |

### 🎨 Frontend & UI (SvelteKit)
| Skill | Use When |
|-------|----------|
| *(none yet)* | Svelte components, SvelteKit routing, stores |

### ⚙️ Backend & APIs (Hono)
| Skill | Use When |
|-------|----------|
| *(none yet)* | Hono routes, middleware, validation |

### 🧪 Testing & Quality
| Skill | Use When |
|-------|----------|
| *(none yet)* | Vitest unit tests, test fixtures, coverage |

### 🔍 Discovery
| Skill | Use When |
|-------|----------|
| `skillsmp-search` | Find new skills, marketplace search, best practices |

---

## Decision Tree

```
Starting a task?
│
├─ UI components / SvelteKit? → Search for: svelte, sveltekit skills
│
├─ State management? → Search for: svelte stores, state management skills
│
├─ Backend API (Hono)? → Search for: hono, node.js backend skills
│
├─ Database (SQLite)? → Search for: sqlite, drizzle, database skills
│
├─ Writing tests? → Search for: vitest, testing skills
│
├─ Auth / GEDCOM / genealogy? → Search for relevant domain skills
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
