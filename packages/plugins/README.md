# Plugins

This directory contains **first-party Ahnenbaum plugins**.

Each plugin lives in its own subdirectory and is a separate npm workspace package. Plugins are implemented in Phase 5.

## Planned Plugins

| Plugin | Description | Phase |
|--------|-------------|-------|
| `charts/` | Pedigree, fan, descendancy charts | Phase 5 |
| `gedcom/` | GEDCOM 7.0 + 5.5.1 import/export | Phase 5 |

## Creating a Plugin

See the plugin architecture docs in the PRD (§4.3) and the `AhnenbaumPlugin` interface in `@ahnenbaum/core`.
