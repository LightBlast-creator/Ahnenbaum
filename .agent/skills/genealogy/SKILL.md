---
name: genealogy
description: Genealogy and family tree domain knowledge for Ahnenbaum. Covers data modeling (persons, relationships, events, places, sources, citations), GEDCOM compatibility, evidence standards, date handling (imprecise/approximate dates), and genealogical best practices. Use when working on family tree features, person/relationship logic, event handling, GEDCOM import/export, genealogical date parsing, source citations, or any domain-specific genealogy work.
---

# Genealogy Domain Knowledge

Domain expertise for building family tree software. This skill captures the conventions and data model used by Ahnenbaum.

## Core Domain Model

```
Person ──has-many──▸ PersonName (birth, married, alias)
   │
   ├──has-many──▸ Event (birth, death, occupation, ...)
   │                └──references──▸ Place
   │                └──references──▸ Citation ──▸ Source
   │
   └──edge-in──▸ Relationship (parent-child, partner)
                    ├── personA (parent / partner 1)
                    └── personB (child / partner 2)
```

### Person
The central entity. Has no name directly — names are separate records (a person can have multiple names across their lifetime).

Key properties:
- `sex`: `male | female | intersex | unknown` — biological, no gendered assumptions
- `privacy`: `public | users_only | owner_only`
- Soft-deleted via `deletedAt`

### PersonName
Multiple names per person (maiden → married → alias). One marked `isPreferred: true`.

Fields: `given`, `surname`, `maiden`, `nickname`, `type` (birth/married/alias)

### Relationship
A typed edge between two persons — **not** GEDCOM's rigid "Family" container.

**Parent-child types**: `biological_parent`, `adoptive_parent`, `step_parent`, `foster_parent`, `guardian`, `godparent`

**Partner types**: `marriage`, `civil_partnership`, `domestic_partnership`, `cohabitation`, `engagement`, `custom`

Convention: For parent-child, `personA` = parent, `personB` = child.
No gendered assumptions — same-sex relationships are first-class.

### Event
Polymorphic fact system. Each event links to a person OR a relationship.

Built-in types: `birth`, `death`, `marriage`, `baptism`, `burial`, `immigration`, `emigration`, `occupation`, `residence`, `military_service`, `education`, `census`, `custom`

### GenealogyDate
Genealogical dates are often imprecise. Stored as a discriminated union (JSON in SQLite):

| Type | Example | Shape |
|------|---------|-------|
| `exact` | "1985-03-15" | `{ type: 'exact', date: string }` |
| `approximate` | "about 1890" | `{ type: 'approximate', date: string }` |
| `range` | "between 1850 and 1860" | `{ type: 'range', from: string, to: string }` |
| `before` | "before 1900" | `{ type: 'before', date: string }` |
| `after` | "after 1800" | `{ type: 'after', date: string }` |

Date strings use ISO 8601 partial formats: `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`.

### Place
Hierarchical via `parentId`: "Munich" → "Bavaria" → "Germany". Optional lat/lng for future map views.

### Source & Citation
Evidence chain following genealogical standards:

```
Source ("Parish Register of Munich, 1850-1900")
  └── Citation ("Entry for Johann Müller, baptism, p. 42")
       └── Event ("Birth of Johann Müller, 1872-03-15")
```

Citation confidence levels: `primary`, `secondary`, `questionable`, `unreliable`

## GEDCOM Compatibility

GEDCOM is the standard interchange format for genealogy data. Key concepts:

- **GEDCOM 5.5.1**: Legacy format, widely supported. Uses ASCII/ANSEL encoding.
- **GEDCOM 7.0**: Modern revision. UTF-8, JSON-LD compatible, cleaner structure.

### Ahnenbaum vs GEDCOM differences

| Concept | GEDCOM | Ahnenbaum |
|---------|--------|-----------|
| Family unit | `FAM` record (rigid husband/wife/children) | Flexible `Relationship` edges |
| Sex | `SEX M/F/U` | `male/female/intersex/unknown` |
| Names | Single `NAME` tag | Multiple `PersonName` records |
| Dates | `DATE` tag with text format | `GenealogyDate` discriminated union |
| Sources | `SOUR`/`CITE` tags | `Source` → `Citation` → `Event` chain |
| Custom facts | `_CUSTOM` tags | `type: 'custom'` events |

### Import considerations
- Map GEDCOM `FAM` records to individual `Relationship` edges
- Handle `SEX U` → `unknown` (not `intersex`)
- Parse GEDCOM date strings into `GenealogyDate` union
- Preserve `_CUSTOM` tags as custom events with original tag in notes

## Genealogical Best Practices

### Evidence-based genealogy
- Every fact should cite a source — prefer primary sources over derivative
- Record what the source says, not your interpretation
- Distinguish between direct and indirect evidence

### Data integrity rules
1. **No circular relationships** — a person cannot be their own ancestor
2. **Reasonable date constraints** — birth before death, parent born before child
3. **One preferred name** — exactly one `PersonName` with `isPreferred: true`
4. **Soft deletes only** — never hard-delete genealogical records

### Privacy considerations
- Default living persons to `owner_only` privacy
- A person is considered "living" if: no death event AND (no birth date OR birth date < 100 years ago)
- Scrub private data from GEDCOM exports

## Project File Locations

| What | Where |
|------|-------|
| Domain model interfaces | `packages/core/src/models/` |
| DB schema (Drizzle) | `packages/server/src/db/schema/` |
| Services (business logic) | `packages/server/src/services/` |
| API routes | `packages/server/src/routes/` |
| Result type + error codes | `packages/core/src/result.ts` |

## Common Tasks

### Adding a new event type
1. Add to `EventType` union in `packages/core/src/models/event.ts`
2. Add to enum in `packages/server/src/db/schema/events.ts`
3. Generate migration: `npx drizzle-kit generate` (from `packages/server/`)
4. Apply migration: `npx drizzle-kit migrate`

### Adding a new relationship type
1. Add to appropriate type union in `packages/core/src/models/relationship.ts`
2. Add to the runtime array (`PARENT_CHILD_TYPES`) if parent-child
3. Add to enum in `packages/server/src/db/schema/relationships.ts`
4. Generate and apply migration

### Handling imprecise dates
```typescript
function displayDate(d: GenealogyDate): string {
  switch (d.type) {
    case 'exact': return d.date;
    case 'approximate': return `about ${d.date}`;
    case 'range': return `between ${d.from} and ${d.to}`;
    case 'before': return `before ${d.date}`;
    case 'after': return `after ${d.date}`;
  }
}
```
