---
id: importers
title: Import Adapters
sidebar_position: 10
---

# Import Adapters

> **Status**: 🚧 Planned — not yet implemented in v1.0

Rackscope is designed to complement existing CMDBs, not replace them. Import adapters will convert external inventory sources into Rackscope topology YAML automatically.

## Planned Adapters

| Adapter | Source | Status |
|---|---|---|
| **NetBox** | NetBox REST API | Planned |
| **RacksDB** | RacksDB YAML/JSON | Planned |
| **BlueBanquise** | Ansible inventory | Planned |
| **CSV** | Generic tabular import | Planned |

## Design Principles

- **Core stays CMDB-agnostic** — importers are separate tools, not core features
- **Output is Topology YAML** — importers write standard Rackscope YAML files
- **Two modes**: bootstrap (initial import) and update (re-import preserving overrides)
- **Non-destructive** — user customizations (templates, checks) are preserved on update

## Current Workaround

Until importers are available:

1. Use the **Topology Editor** (`/editors/topology`) to build your topology manually
2. Or write topology YAML directly — see [Topology YAML Reference](./topology-yaml.md)
3. Or write a custom script using the [Topology YAML schema](./topology-yaml.md)

## Example Topology YAML

See [Topology YAML Reference](./topology-yaml.md) for the full schema that importers will generate.
