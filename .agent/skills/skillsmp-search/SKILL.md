---
name: skillsmp-search
description: Discover and download agent skills from SkillsMP marketplace using their API. Use when looking for skills to extend capabilities, finding best practices for specific technologies, or researching community solutions.
---

# SkillsMP Skill Discovery

Search the [SkillsMP](https://skillsmp.com) marketplace for community-built agent skills.

## Authentication

Use Bearer token authentication with the project's API key:

```bash
Authorization: Bearer sk_live_skillsmp_ohqh3YuF4wbk7dVfcHcwD1UHHRtPRo9rYbKgh9HFdIo
```

## API Endpoints

### AI Semantic Search (Recommended)

Best for natural language queries about capabilities or project needs:

```bash
curl -X GET "https://skillsmp.com/api/v1/skills/ai-search?q=YOUR_QUERY" \
     -H "Authorization: Bearer sk_live_skillsmp_ohqh3YuF4wbk7dVfcHcwD1UHHRtPRo9rYbKgh9HFdIo"
```

**Example queries:**
- `"SvelteKit components and routing"`
- `"Hono backend API patterns"`
- `"Vitest testing patterns"`

### Keyword Search

For exact skill names or specific terms:

```bash
curl -X GET "https://skillsmp.com/api/v1/skills/search?q=KEYWORD&limit=10&sortBy=stars" \
     -H "Authorization: Bearer sk_live_skillsmp_ohqh3YuF4wbk7dVfcHcwD1UHHRtPRo9rYbKgh9HFdIo"
```

**Parameters:**
- `q` (required): Search query
- `limit`: Results per page (default: 20, max: 100)
- `sortBy`: `"stars"` or `"recent"`
- `page`: Page number for pagination

## Response Structure

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "skill": {
          "id": "skill-slug",
          "name": "Skill Name",
          "author": "github-username",
          "description": "What the skill does",
          "githubUrl": "https://github.com/...",
          "skillUrl": "https://skillsmp.com/skills/...",
          "stars": 42
        },
        "score": 0.85
      }
    ]
  }
}
```

## Installing a Skill

1. Get the `githubUrl` from the search result
2. Convert to raw GitHub URL for the SKILL.md file
3. Download to `.agent/skills/<skill-name>/SKILL.md`

**Example:**
```bash
# From: https://github.com/author/repo/tree/main/.claude/skills/my-skill
# Download:
curl -sL "https://raw.githubusercontent.com/author/repo/main/.claude/skills/my-skill/SKILL.md" \
     -o .agent/skills/my-skill/SKILL.md
```

4. **Update the skill-index**: Add the new skill to `.agent/skills/skill-index/SKILL.md`

## Search Strategy

1. **Start with AI search** for broad capability needs
2. **Use keyword search** when you know specific tool/library names
3. **Sort by stars** to find popular, well-maintained skills
4. **Check the score** (higher = better semantic match)

## Common Search Patterns

| Need | Query |
|------|-------|
| Frontend framework | `"Svelte SvelteKit components"` |
| Testing | `"Vitest unit test patterns"` |
| Backend API | `"Hono Node.js API middleware"` |
| Database | `"SQLite better-sqlite3 Drizzle"` |
| Styling | `"CSS design system"` |
| Auth | `"OAuth JWT session authentication"` |
| Data import | `"GEDCOM genealogy data parsing"` |
