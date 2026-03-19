# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta1] — 2026-03-18

First public beta. Production-ready implementation after 9 development phases.

### Features

**Monitoring views**
- World map — all sites with geolocation markers and health states
- Datacenter view — site-level overview with room cards and mini rack grids
- Room view — interactive floor plan with aisle layout, rack grid, health heatmap (10 rack styles)
- Rack view — front/rear elevation with exact device placement and U occupancy
- Device view — per-instance tabs with health checks and metric charts
- Cluster view — compact multi-rack wallboard (NOC screen)

**Health system**
- OK / WARN / CRIT / UNKNOWN states propagating upward (instance → rack → room → site)
- Health checks defined in YAML via PromQL expressions
- Template-driven: checks assigned per device/rack template
- `expand_by_label` for per-component monitoring (drives, ports, fans)

**Performance**
- `TopologyIndex` — O(1) lookup for site/room/aisle/rack/device/instance
- `ServiceCache` — response-level cache (5s TTL) above TelemetryPlanner
- `TelemetryPlanner` — batched PromQL queries (configurable `max_ids_per_query`)

**Editors (visual, no YAML required)**
- Topology editor — manage sites, rooms, aisles, racks
- Rack editor — drag-and-drop device placement with U-collision detection
- Templates editor — device and rack templates with Monaco YAML editor
- Checks library editor
- Settings UI — full app.yaml configuration via UI

**Plugins**
- **Simulator** — generates realistic Prometheus metrics for testing without real hardware
- **Slurm** — workload manager integration: node states, partitions, job tracking, wallboard

**Security**
- Optional JWT authentication (bcrypt rounds=13, HS256)
- Rate-limited login (10 attempts / 15 min)
- Path traversal protection on all topology mutation endpoints
- Avatar upload: MIME allowlist, magic bytes verification, 512KB limit

### Testing

- 1039 tests — API endpoints, model validation, telemetry planner, simulator, Slurm
- 90% code coverage
- 0 mypy type errors · 0 ESLint errors/warnings

### Bundled examples

| Name | Description |
|---|---|
| `homelab` | 1 site, 1 room, 4 racks, 23 nodes |
| `small-cluster` | 2 sites, shared infrastructure, 608 nodes |
| `hpc-cluster` | 855 nodes, Slurm integration |
| `exascale` | 14 000+ nodes, multi-datacenter, 3 sites |

### Known limitations (beta)

- Single admin user — RBAC roles planned post-beta
- No import adapters yet (NetBox, RacksDB, BlueBanquise) — planned post-beta
- TanStack Query migration planned (manual fetch → server-state)
