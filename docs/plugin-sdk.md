# Ahnenbaum Plugin SDK

Build plugins for Ahnenbaum using the typed `AhnenbaumPlugin` interface.

## Quick Start — Hello World

```typescript
import type { AhnenbaumPlugin } from '@ahnenbaum/core';

const plugin: AhnenbaumPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Minimal example plugin',

  async activate(ctx) {
    ctx.logger.info('Hello from plugin!');

    ctx.on('person.created', (payload) => {
      ctx.logger.info(`Person created: ${payload.personId}`);
    });
  },

  routes: [
    {
      method: 'GET',
      path: '/hello',
      handler: () => new Response(JSON.stringify({ message: 'Hello!' })),
    },
  ],
};

export default plugin;
```

## Lifecycle

```
discover → validate → activate → hooks fire → deactivate
```

1. **Discover** — Plugin loader scans `packages/plugins/*/` for entry files
2. **Validate** — Checks `name` (string), `version` (string), `activate` (function)
3. **Activate** — `plugin.activate(ctx)` called with a `PluginContext`
4. **Hooks fire** — Core events (person.created, etc.) dispatched to subscribers
5. **Deactivate** — `plugin.deactivate()` called on shutdown or unload

## PluginContext API

| Method                      | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `ctx.on(hook, callback)`    | Subscribe to a lifecycle event. Returns `Disposable` |
| `ctx.emit(hook, payload)`   | Emit an event for inter-plugin communication         |
| `ctx.getConfig(key)`        | Read `PLUGIN_{NAME}_{KEY}` env var                   |
| `ctx.logger.info(msg)`      | Scoped logger (debug/info/warn/error)                |
| `ctx.db.query(sql, params)` | Raw SQL query (⚠️ use with care)                     |

## Hook Reference

| Hook                   | Payload                            | When                      |
| ---------------------- | ---------------------------------- | ------------------------- |
| `person.created`       | `{ personId, person }`             | After person insert       |
| `person.updated`       | `{ personId, person, changes }`    | After person update       |
| `person.deleted`       | `{ personId }`                     | After person delete       |
| `relationship.created` | `{ relationshipId, relationship }` | After relationship insert |
| `relationship.deleted` | `{ relationshipId }`               | After relationship delete |
| `media.uploaded`       | `{ mediaId, media }`               | After media upload        |
| `media.deleted`        | `{ mediaId }`                      | After media delete        |
| `tree.exported`        | `{ format, personCount }`          | After GEDCOM/other export |
| `tree.imported`        | `{ format, personCount }`          | After import              |
| `plugin.activated`     | `{ pluginName }`                   | After plugin activation   |
| `plugin.deactivated`   | `{ pluginName }`                   | After plugin deactivation |

## Panel Slots

| Slot                    | Location                | Use Case          |
| ----------------------- | ----------------------- | ----------------- |
| `person.detail.tab`     | Person detail page      | Extra tab content |
| `person.detail.sidebar` | Person detail sidebar   | Sidebar widgets   |
| `dashboard.widget`      | Dashboard below actions | Dashboard cards   |
| `tree.overlay`          | Tree view overlay       | Chart controls    |
| `navigation.item`       | Sidebar navigation      | Nav links         |
| `global.action`         | Header actions area     | Action buttons    |

## Route Registration

Plugin routes are mounted at `/api/plugin-routes/{pluginName}/`.

```typescript
routes: [
  { method: 'POST', path: '/import', handler: handleImport },
  { method: 'GET',  path: '/export', handler: handleExport },
],
// Accessible at: /api/plugin-routes/my-plugin/import
```

## Configuration

Plugin config via environment variables: `PLUGIN_{UPPERNAME}_{KEY}`.

```bash
PLUGIN_MY_PLUGIN_API_KEY=secret123
```

```typescript
const key = ctx.getConfig('api_key'); // reads PLUGIN_MY_PLUGIN_API_KEY
```

## Trust Model

Plugins run **in-process** with full access to the Node.js runtime. There is no sandboxing. Only install plugins you trust.

## Plugin Structure

```
packages/plugins/my-plugin/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts    ← default export: AhnenbaumPlugin
```
