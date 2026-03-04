---
description: How to create a new entity list page using the shared entity-page layout system
---

# Creating a New Entity List Page

When adding a new collection/list page (e.g., events, documents, etc.), follow this pattern to maintain visual consistency and avoid code duplication.

## 1. Use shared CSS classes

All entity list pages import `entity-page.css` via `global.css`. **Do not duplicate layout CSS in scoped styles.**

### Required wrapper structure:
```svelte
<div class="entity-page">
  <header class="page-header">
    <h1>{m.your_title()}</h1>
    <!-- Optional: add button, search, or filter bar -->
    <button class="btn-primary" onclick={...}>+ {m.your_add()}</button>
  </header>

  <!-- Content goes here -->
</div>
```

### Available shared classes:

| Class | Purpose |
|---|---|
| `.entity-page` | Page wrapper (max-width: 900px, centered, padded) |
| `.page-header` | Flex header (title left, actions right) |
| `.card`, `.add-form` | Card containers for inline forms |
| `.entity-table` | Bordered table container |
| `.table-header` | Grid header row (uppercase, muted) |
| `.table-row` | Grid data row (hover, editing states) |
| `.cell-name` | Primary cell (semibold) |
| `.cell-muted` | Secondary cell (muted color) |
| `.col-actions` | Right-aligned action buttons |
| `.inline-input` | Inline editing input |
| `.btn-icon`, `.btn-icon.delete` | Icon action buttons |
| `.empty` | Empty state text |
| `.toolbar` | Flex container for search/filters |
| `.search-box`, `.search-icon`, `.search-input` | Search with icon |
| `.filter-bar`, `.filter-btn` | Pill-style tab filters |

### For tables, define only the grid columns as scoped CSS:
```svelte
<style>
  .your-grid {
    grid-template-columns: 2fr 1fr 1fr auto;
  }
</style>
```

Then apply both classes: `<div class="table-header your-grid">`.

## 2. Use form classes from `forms.css`

Form layout uses `.form-row`, `.form-field`, `.form-actions`, `.btn-primary`, `.btn-secondary` from the shared `forms.css`.

## 3. For wider pages (e.g., galleries)

Override `max-width` with a scoped class:
```svelte
<div class="entity-page wider-page">...</div>

<style>
  .wider-page { max-width: 1200px; }
</style>
```

## 4. Reference implementations

- **Simple table**: `routes/places/+page.svelte`
- **Table with expandable details**: `routes/sources/+page.svelte`
- **Search + component table**: `routes/persons/+page.svelte`
- **Filter bar + gallery**: `routes/media/+page.svelte`
