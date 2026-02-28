# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — v1.0.0

### Breaking Changes

- **App URL migration**: All routes moved from `/cosmos/*` to `/*` (root prefix)
  - Old: `http://localhost:5173/cosmos/views/room/dc1-a-r1`
  - New: `http://localhost:5173/views/room/dc1-a-r1`
- **localStorage keys renamed**: `cosmos-*` → `rackscope.*`
  - `cosmos-theme` → `rackscope.theme`
  - `cosmos-sidebar` → `rackscope.sidebar`
- **CSS classes renamed**: `.cosmos-*` → `.rs-*`
  - `.cosmos-root` → `.rs-root`
  - `.cosmos-sidebar` → `.rs-sidebar`
  - `.cosmos-scrollbar` → `.rs-scrollbar`
- **Topology editor URL**: `/cosmos/topology/editor` → `/editors/topology`
- **Rack editor URL**: `/cosmos/rack/{id}/editor` → `/editors/rack`

### Added

#### Phase 6 — Backend Plugin Architecture

- `SimulatorPlugin`: full extraction of simulator functionality into plugin
  - Routes: `/api/simulator/status`, `/api/simulator/scenarios`, `/api/simulator/overrides`
  - Menu section "Simulator" (order=200)
- `SlurmPlugin`: full extraction of Slurm integration into plugin
  - Routes: `/api/slurm/rooms/{id}/nodes`, `/api/slurm/summary`, `/api/slurm/partitions`, `/api/slurm/nodes`
  - Menu section "Workload" (order=50)
- `RackscopePlugin` abstract base class (`plugins/base.py`)
- `PluginRegistry` for lifecycle management (`plugins/registry.py`)
- `MenuSection` / `MenuItem` models for dynamic frontend navigation
- `/api/plugins` and `/api/plugins/menu` endpoints for plugin discovery
- `services/metrics_service.py`: generic template-driven metrics collection
  - `collect_component_metrics()` — replaces 35 lines of hardcoded Raritan PDU queries
  - `collect_device_metrics()` — replaces 37 lines of hardcoded node temperature/power queries
- `metrics: List[str]` field added to `DeviceTemplate` (mirrors `RackComponentTemplate.metrics`)
- 37 new plugin system tests

#### Phase 6.5 — Metrics Library System

- `model/metrics.py`: `MetricDefinition`, `MetricsLibrary` Pydantic models
- `api/routers/metrics.py`: metrics API endpoints
  - `GET /api/metrics/library` — list all metric definitions
  - `GET /api/metrics/library/{id}` — get single metric definition
  - `GET /api/metrics/data` — query live metric data (instant + range)
- `config/metrics/library/`: 39 metric YAML definitions
  - Categories: temperature, power, compute, storage, network, infrastructure
  - Display config: unit, chart_type, color, thresholds (warn/crit), time_ranges
- Simulator refactored to use metrics library dynamically (no hardcoded metric lists)
- `GET /api/simulator/metrics` — discover available metrics from simulator
- `ARCHITECTURE/decisions/ADR-007-METRICS-LIBRARY.md` — architecture decision record

#### Phase 7 — Frontend Rebuild (cosmos → app/ migration)

- `frontend/src/app/`: complete frontend application (migrated from `frontend/src/cosmos/`)
- `AppRouter.tsx`: React Router v6 with all routes at `/` root
- `AppLayout.tsx` + `AppHeader.tsx` + `AppSidebar.tsx`: new application shell
- `AppConfigContext.tsx`: app configuration and feature flags context
- Dynamic plugin menu: sidebar fetches `/api/plugins/menu` and renders plugin sections
- ApexCharts integration replacing Chart.js for metrics visualization
- `PUT /api/config` endpoint: saves config to `config/plugins/simulator/config.yml` and syncs simulator
- Auth: `GET /api/auth/status`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Slurm live views: Overview, Nodes, Partitions, Alerts, Wallboard pages (all fully functional)
- `SlurmConfigLike` Protocol in `services/slurm_service.py` for type-safe service layer

#### Phase 8 — Performance Optimizations

- Backend: dict-indexed topology lookup (O(1) rack/room resolution)
- Frontend: `useMemo` / `useCallback` on expensive components
- Bundle size reduction via code splitting

#### Phase 9 — Documentation & Cleanup

- `website/`: Docusaurus 3 documentation site
  - `make docs` to start (http://localhost:3001)
  - `make docs-build` to build static site
- `CLAUDE.md`: full rewrite reflecting post-migration state
- `README.md`: professional rewrite with badges and accurate Quick Start
- `CHANGELOG.md`: this file — full history from v0.x to v1.0
- `old_claude.md`: archived pre-migration CLAUDE.md for historical reference
- `mypy.ini`: 0 type errors (resolved 57 errors across 16 files)

### Changed

- `frontend/src/cosmos/` → `frontend/src/app/` (full directory rename + file cleanup)
- Simulator status endpoint: uses Docker hostname `simulator:9000` (was `localhost:9000`)
- `PUT /api/config` now syncs to `config/plugins/simulator/config.yml` after save
- `SlurmPlugin` uses `SlurmPluginConfig` (separate from `SlurmConfig` in `model/config.py`)
- `SimulatorPlugin` uses `SimulatorPluginConfig` (separate from `SimulatorConfig`)
- `make typecheck` now calls `/home/appuser/.local/bin/mypy` (explicit path in container)
- `ARCHITECTURE/plans/CONSOLIDATED_ROADMAP.md`: phases 6, 6.5, 7, 8, 9 marked ✅ COMPLETE
- `.gitignore`: added `website/node_modules/`, `website/build/`, `website/.docusaurus/`
- `Makefile`: added `docs` and `docs-build` targets

### Fixed

- `saveWidgets` temporal dead zone crash in `DashboardPage.tsx`
- Simulator `running=false` incorrect in `/api/simulator/status` endpoint
- Scenario not applying after settings save (config sync bug)
- Slurm test isolation: `SlurmPluginConfig` vs `SlurmConfig` mismatch causing test failures
- 362/362 tests passing (was 360/362 with 2 pre-existing failures)
- 0 mypy type errors (was 57 errors across 16 files)
- All linters passing: ruff, eslint, stylelint, prettier

---

## [0.9.0] — Phase 6 completion (2026-02-02)

### Added
- Plugin architecture: `RackscopePlugin`, `PluginRegistry`, `MenuSection`/`MenuItem`
- `SimulatorPlugin` and `SlurmPlugin` extracted from core
- Generic `metrics_service.py` (removed 105 lines of hardcoded Prometheus queries)
- 311 tests (was 251)

---

## [0.8.0] — Phase 5 completion

### Added
- Test coverage: 66% (was 36%), 251 tests
- Router tests, service tests, model tests

---

## [0.7.0] — Phase 4 completion

### Added
- Structured logging replacing `print()` calls
- Global exception handlers
- Request logging middleware

---

## [0.6.0] — Phase 3 completion

### Added
- `services/` directory: topology, telemetry, instance, slurm services
- Business logic extracted from API layer

---

## [0.5.0] — Phase 2 completion

### Added
- `api/dependencies.py`: FastAPI dependency injection
- Clean dependency graph, improved testability

---

## [0.4.0] — Phase 1 completion

### Added
- `api/routers/`: domain-scoped router files (topology, catalog, checks, telemetry, config)
- `app.py` reduced from 2014 lines to < 200 lines

---

## [0.1.0] — Initial release

### Added
- Physical topology model: Site → Room → Aisle → Rack → Device → Instance
- YAML-based configuration (topology, templates, checks)
- Prometheus integration with PromQL query planning
- FastAPI backend with REST API
- React frontend with rack/room visualization
- Simulator for testing without real hardware
- Slurm integration (node states, wallboard)
- Health check engine (OK/WARN/CRIT/UNKNOWN aggregation)
- Visual editors (topology, rack, templates, checks)
