# Architecture Documentation

Internal design documents for Rackscope contributors.

> **User-facing documentation** lives in `website/docs/` (Docusaurus).
> These files are for **internal reference** and historical context.

---

## Reference docs (still relevant)

| File | Content | Public equivalent |
|---|---|---|
| `reference/CHECKS_LIBRARY.md` | Check YAML format, expand_by_label, planner integration | `docs/user-guide/health-checks.md` |
| `reference/PLUGIN_DEVELOPMENT.md` | Full plugin dev guide (advanced patterns) | `docs/plugins/writing-plugins.md` |
| `reference/TESTING.md` | Test structure, commands, patterns | `docs/development/testing.md` |
| `reference/VIEW_MODEL.md` | Data model spec (Site→Room→Rack→Device) | `docs/architecture/data-model.md` |
| `reference/IMPORTERS.md` | Planned import adapters (NOT IMPLEMENTED) | `docs/admin-guide/importers.md` |

## Decision records

| File | Content |
|---|---|
| `decisions/ADR.md` | ADRs 001-006 (foundational decisions) |
| `decisions/ADR-007-METRICS-LIBRARY.md` | Metrics library architecture decision |

## Feature specs

| File | Content | Status |
|---|---|---|
| `features/VIRTUAL_NODES_EXPANSION.md` | Per-component health (expand_by_label) | ✅ Implemented — see health-checks.md |

## Historical (keep for reference)

| File | Content |
|---|---|
| `plans/CONSOLIDATED_ROADMAP.md` | Full phases 0-9 roadmap (all complete) |
| `plans/PLUGIN_ARCHITECTURE.md` | Plugin system design (implemented) |
| `archive/old_claude.md` | Archived pre-Phase7 CLAUDE.md |

---

**Rule**: When a reference file is fully covered by Docusaurus, add a note pointing to the public doc.
When updating reference files, update the Docusaurus equivalent in the same commit.
