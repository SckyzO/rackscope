# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Old version available**: If you find information in `old_claude.md` that contradicts or complements this file,
> **stop and ask the user**: _"I'm about to use information from old_claude.md — is this still valid?"_
> `old_claude.md` reflects the state before Phase 7-9 (pre-migration), and is kept only for historical reference.

## Project Overview

Rackscope is a **Prometheus-first physical infrastructure monitoring dashboard** for data centers and HPC environments. It provides visual monitoring of the physical hierarchy (Site → Room → Aisle → Rack → Device → Instance) **without owning a CMDB or collecting metrics itself**.

**Current Development Phase**: Phase 9 complete — documentation & cleanup, preparing v1.0 public release.

### Core Philosophy (NON-NEGOTIABLE)

These principles are **strict rules** that must NEVER be violated:

1. **File-based configuration (YAML) as source of truth**: No mandatory database. GitOps-friendly.
2. **Prometheus-only for telemetry**: No internal time-series database. All metrics queried live via PromQL.
3. **Template-driven to reduce duplication**: Hardware defined once, reused across topology.
4. **NOT a CMDB**: This is a visualization layer. External CMDBs (NetBox, RacksDB, BlueBanquise) are inputs via importers.
5. **NOT replacing Prometheus/Alertmanager/Grafana**: This complements them with physical views.
6. **HPC-native**: Support for high-density chassis (Twins, Quads, Blades), liquid cooling (HMC), and shared infrastructure.
7. **🚨 GENERIC CORE - VENDOR-AGNOSTIC 🚨**: The core system MUST remain generic and vendor-agnostic. **NEVER hardcode vendor-specific logic** (E-Series, DDN, NetApp, IBM, Slurm, etc.) in the core codebase. Vendor-specific behavior belongs in:
   - **Configuration files** (checks, templates, metrics)
   - **Plugin system** (optional vendor integrations)
   - **Documentation** (examples for specific vendors)

   ❌ **NEVER DO THIS:**
   ```python
   # WRONG: Hardcoded E-Series logic in core
   if metric_name == "eseries_drive_status":
       query = f'eseries_drive_status{{instance="{instance}",slot="{slot}"}}'
   ```

   ✅ **DO THIS INSTEAD:**
   ```python
   # RIGHT: Generic logic driven by configuration
   if check.expand_by_label:
       query = f'{check.expr}{{instance="{instance}",{check.expand_by_label}="{label_value}"}}'
   ```

   **Examples of generic design:**
   - Storage arrays: Use `expand_by_label` field in checks (works for E-Series slot, DDN drive, NetApp disk)
   - Workload managers: Plugin system for Slurm, PBS, LSF
   - Device types: Template-driven (`type: storage`, `storage_type: eseries` in config, not code)
   - Metrics: Configuration-driven in YAML, never hardcoded in Python/TypeScript

   **If you catch yourself writing vendor-specific code in core modules, STOP and refactor to be generic.**

### What Rackscope IS and IS NOT

**IS:**
- A physical monitoring view layer
- Operator/NOC-friendly wallboard with drill-down
- File-based configuration with visual editors
- Prometheus-first with PromQL query planning

**IS NOT:**
- A CMDB replacement
- A metric collector
- A Grafana plugin
- Tightly coupled to specific hardware protocols (SNMP/Redfish/IPMI)

## Development Environment

### ⚠️ EVERYTHING RUNS IN CONTAINERS ⚠️

**CRITICAL**: This project is **100% container-based**. There is **NO local development environment**.

- **DO NOT** install Python dependencies locally
- **DO NOT** install npm packages locally
- **DO NOT** run `npm install` or `pip install` on your host machine
- **ALL** development, testing, and linting happens **inside Docker containers**

The only requirement on your host machine is **Docker** and **Docker Compose**.

### Development Commands (Makefile)

All commands below use the `Makefile` which orchestrates Docker Compose operations.

#### Start the Stack

Start all services (backend, frontend, simulator, Prometheus):
```bash
make up
```

This runs: `docker compose -f docker-compose.dev.yml up -d`

Services started:
- **backend**: FastAPI on `http://localhost:8000`
- **frontend**: Vite dev server on `http://localhost:5173`
- **simulator**: Metrics simulator on `http://simulator:9000` (Docker hostname; `http://localhost:9000` from host)
- **prometheus**: Prometheus on `http://localhost:9090`

#### Stop the Stack

```bash
make down
```

#### Restart Services

```bash
make restart
```

Use this when you need to reload configuration files without rebuilding containers.

#### View Logs

```bash
make logs
```

**Tips:**
- Press `Ctrl+C` to stop following logs
- To view logs for a specific service: `docker compose -f docker-compose.dev.yml logs -f backend`
- To view last N lines: `docker compose -f docker-compose.dev.yml logs --tail=100 backend`

#### Rebuild Containers

```bash
make build
```

After rebuilding, restart with `make up`.

#### Clean Everything

```bash
make clean
```

**Warning**: This deletes all data in volumes (Prometheus data, etc.).

### Linting and Quality

Run all linters (backend + frontend) **inside containers**:
```bash
make lint
```

This executes **inside running containers**:
1. **Backend**:
   - `ruff check .`
   - `ruff format --check .`
2. **Frontend**:
   - `npm run lint` (ESLint)
   - `npm run lint:css` (Stylelint)
   - `npm run lint:format` (Prettier check)

**IMPORTANT**: The stack must be running (`make up`) before running `make lint`.

### Testing

Run backend tests with pytest **inside containers**:
```bash
make test
```

Tests are located in `tests/` and use the TestClient to test API endpoints.

**IMPORTANT**: The stack must be running (`make up`) before running `make test`.

### Type Checking

```bash
make typecheck
```

This runs: `docker compose -f docker-compose.dev.yml exec backend /home/appuser/.local/bin/mypy src/rackscope`

**Target**: 0 type errors (currently achieved).

### Working Inside Containers

**Backend shell:**
```bash
docker compose -f docker-compose.dev.yml exec backend bash
# Then run any Python command, e.g.:
# pytest -v
# ruff check src/
```

**Frontend shell:**
```bash
docker compose -f docker-compose.dev.yml exec frontend sh
# Then run any npm command, e.g.:
# npm run build
# npm run lint
```

**Install new dependencies:**

Backend (Python):
```bash
# Edit pyproject.toml first, then:
docker compose -f docker-compose.dev.yml exec backend pip install -e .
# Or rebuild if you want it persistent:
make build
```

Frontend (npm):
```bash
# Edit package.json first, then:
docker compose -f docker-compose.dev.yml exec frontend npm install
# Or rebuild if you want it persistent:
make build
```

## AI Development Tools

### Context7 for Documentation Access

**IMPORTANT**: When working with external libraries, frameworks, or implementing features based on specific technologies, **ALWAYS use Context7 MCP** to access official documentation and best practices.

**Use Context7 for:**
- Looking up official API documentation (Prometheus, React, FastAPI, etc.)
- Finding code examples from official sources
- Understanding best practices for specific libraries
- Getting up-to-date syntax and patterns
- Verifying metric names and PromQL queries

**Example workflow:**
```
User: "Add CPU metrics from node_exporter"
→ Use Context7 to query Prometheus node_exporter documentation
→ Get actual metric names (node_cpu_seconds_total, etc.)
→ Implement with real metric names, not guessed ones
```

**How to use:**
1. Use `mcp__plugin_context7_context7__resolve-library-id` to find the library
2. Use `mcp__plugin_context7_context7__query-docs` with specific questions
3. Implement based on actual documentation, not assumptions

**NEVER guess or invent:**
- Metric names
- API endpoints
- Configuration formats
- Library APIs

**ALWAYS verify with Context7 first.**

### Frontend Design Skill

**IMPORTANT**: When working on UI/UX design, frontend components, or visual layouts, **ALWAYS use the /frontend-design skill** for production-grade design quality.

**Use /frontend-design for:**
- Creating new UI components
- Designing page layouts
- Implementing visual features
- Building forms and interactive elements
- Styling and theming
- Responsive design

**The /frontend-design skill:**
- Produces production-grade, distinctive designs
- Avoids generic AI aesthetics
- Ensures proper accessibility
- Uses project's design system (Tailwind CSS, dark mode first-class)
- Creates polished, professional interfaces

**When NOT to use /frontend-design:**
- Backend API changes
- Configuration file updates
- Testing or linting
- Database/data model work

**Call the skill using:**
```
Skill tool with skill="frontend-design"
```

## Architecture

### Backend (Python / FastAPI)

**Location**: `src/rackscope/`

**Stack**:
- Python 3.12+
- FastAPI + Uvicorn
- Pydantic for models
- httpx for async Prometheus client
- PyYAML for configuration

**Key Modules:**
- `api/app.py`: FastAPI application with all REST endpoints, global state (`TOPOLOGY`, `CATALOG`, `CHECKS_LIBRARY`, `APP_CONFIG`, `PLANNER`)
- `model/domain.py`: Pydantic models for physical topology (Site, Room, Aisle, Rack, Device)
- `model/catalog.py`: Device and rack templates (the "hardware catalog")
- `model/checks.py`: Health check definitions (PromQL + rules)
- `model/metrics.py`: Metrics library definitions (MetricDefinition, MetricsLibrary)
- `model/config.py`: Application configuration model (paths, telemetry, cache, planner, simulator)
- `model/loader.py`: YAML loading and validation for topology, catalog, checks, metrics
- `telemetry/prometheus.py`: Async Prometheus client with caching and deduplication
- `telemetry/planner.py`: **Query planner** that batches Prometheus queries to avoid explosion (critical for scaling)
- `health/`: Health state calculation engine (OK/WARN/CRIT/UNKNOWN + aggregation)
- `services/metrics_service.py`: Generic template-driven metrics collection service
- `services/slurm_service.py`: Slurm node state resolution with SlurmConfigLike Protocol
- `plugins/slurm/config.py`: SlurmPluginConfig model (separate from SlurmConfig in model/config.py)
- `plugins/simulator/config.py`: SimulatorPluginConfig model

**Backend runs on**: `http://localhost:8000`
**API docs**: `http://localhost:8000/docs` (Swagger UI)

#### Plugin System

**Location**: `src/rackscope/plugins/`

The backend uses a **plugin architecture** to separate core functionality from optional features:

**Core System** (always active):
- Physical topology visualization
- Prometheus telemetry integration
- Health checks and alerting
- YAML editors

**Plugins** (can be enabled/disabled):
- `SimulatorPlugin`: Demo mode with metric overrides and test scenarios
- `SlurmPlugin`: Workload manager integration (node states, partitions, job tracking)

**Plugin Infrastructure:**
- `plugins/base.py`: RackscopePlugin abstract base class, MenuSection/MenuItem models
- `plugins/registry.py`: PluginRegistry for lifecycle management (register, initialize, shutdown)
- `api/routers/plugins.py`: API endpoints for plugin discovery (`/api/plugins`, `/api/plugins/menu`)

**Plugin Capabilities:**
- Register custom API routes via `register_routes(app)`
- Contribute menu sections via `register_menu_sections()` for frontend navigation
- Lifecycle hooks: `on_startup()`, `on_shutdown()`
- Dynamic menu ordering (Workload=50, Simulator=200)

**Adding a New Plugin:**
1. Create `plugins/{name}/backend/plugin.py` implementing `RackscopePlugin`
2. Register in `api/app.py` lifespan using a **conditional import** — NEVER a top-level import:
   ```python
   if _plugin_enabled("your-plugin"):
       from plugins.your_plugin.backend import YourPlugin
       plugin_registry.register(YourPlugin())
   ```
3. Enable in `app.yaml`: `plugins.your-plugin.enabled: true`
4. Plugin routes and menu sections are auto-registered during `initialize()`

**⚠️ NEVER use a top-level import for a plugin** (`from plugins.X import ...` at module level in `app.py`). This would load the plugin unconditionally regardless of config, defeating the autonomous plugin architecture. Use deferred imports inside the `if _plugin_enabled(...)` block.

### Frontend (React / TypeScript / Vite)

**Location**: `frontend/src/app/`

**Stack:**
- React 19 + TypeScript
- Tailwind CSS v4
- React Router (v6 API, browser router at `/`)
- Leaflet for room floor plans (world map)
- Monaco Editor for YAML editing
- ApexCharts for metrics visualization
- Lucide React for icons

**Key Components:**
- `app/layout/AppLayout.tsx`: Main application shell with sidebar and header
- `app/layout/AppSidebar.tsx`: Explorer-style navigation tree (Site → Room → Aisle → Rack) + plugin menu sections
- `app/layout/AppHeader.tsx`: Top navigation bar with search, notifications, user menu
- `app/AppRouter.tsx`: React Router configuration — all routes accessible at `/` (root)
- `app/contexts/AppConfigContext.tsx`: App configuration and feature flags context
- `app/pages/`: All views organized by domain (views/, editors/, slurm/, rackscope/, ui/, charts/, tables/)

**CSS Classes:**
- Root: `.rs-root`
- Sidebar: `.rs-sidebar`, `.rs-sidebar-nav`
- Scrollbar: `.rs-scrollbar`

**localStorage Keys:**
- Theme: `rackscope.theme`
- Sidebar state: `rackscope.sidebar`
- Other preferences: `rackscope.*` namespace

**Frontend runs on**: `http://localhost:5173` (Vite dev server with HMR)

**Routes** (all at root `/`, no prefix):
- `/` — Dashboard
- `/views/worldmap` — World map
- `/views/room/:roomId` — Room view
- `/views/rack/:rackId` — Rack view
- `/views/device/:rackId/:deviceId` — Device view
- `/views/cluster` — Cluster overview
- `/slurm/overview`, `/slurm/nodes`, `/slurm/alerts`, `/slurm/partitions`, `/slurm/wallboard/:roomId` — Slurm views
- `/editors/topology`, `/editors/templates`, `/editors/checks`, `/editors/rack`, `/editors/settings` — Editors
- `/auth/signin`, `/auth/signup` — Auth pages

### Configuration Files

**Location**: `config/`

#### Application Config
- `app.yaml`: **Central application configuration**
  - Paths: topology, templates, checks, metrics
  - Telemetry: Prometheus URL, auth, TLS, identity label mapping
  - Refresh: room/rack state refresh intervals (default: 60s+)
  - Cache: TTL for Prometheus queries (default: 60s)
  - Planner: cache TTL, max IDs per query, unknown state handling
  - Features: demo, notifications, playlist, offline
  - Slurm: metric, labels, status mapping, optional node mapping file
  - Simulator: scenarios, overrides, metrics catalogs

#### Topology (Two Options)

**Option A — Monolithic** (simple labs, demos):
- Single `topology.yaml` with all sites/rooms/racks

**Option B — Segmented** (recommended for production):
```
config/topology/
  sites.yaml                          # Top-level sites list
  datacenters/{site_id}/
    rooms/{room_id}/
      room.yaml                       # Room definition + aisle refs + standalone racks
      aisles/{aisle_id}/
        aisle.yaml                    # Aisle definition + rack refs
        racks/{rack_id}.yaml          # Rack + devices
      standalone_racks/{rack_id}.yaml # Racks outside aisles
```

**Why segmented is preferred:**
- Smaller files, cleaner git diffs
- Safer concurrent editing (room/aisle/rack scoped)
- Easier automation and importers per zone

#### Templates
- `templates/devices/{type}/`: Device templates (organized by type: server, switch, storage, pdu, etc.)
- `templates/racks/`: Rack templates (define infrastructure like PDUs, HMC, cooling)
- `templates/rack_components/`: Rack-level components (PDUs, switches, HMC modules)

#### Checks Library
- `checks/library/*.yaml`: Health check definitions
  - Folder-based (no monolith)
  - Each file is a family (ipmi.yaml, up.yaml, eseries.yaml, sequana3.yaml, pdu.yaml, switch.yaml)
  - Checks define: id, kind, scope (node/chassis/rack), PromQL expr, rules (thresholds → severity)

#### Metrics Library
- `metrics/library/*.yaml`: Metric definitions
  - Each file defines a metric: id, name, description, expr, display (unit, chart_type, color, thresholds), category, tags
  - Used by `/api/metrics/library` and `/api/metrics/data` endpoints
  - Referenced by device/rack component templates via `metrics: [metric_id_list]`

#### Other Files
- `plugins/simulator/scenarios.yaml`: Simulator scenarios (demo-small, full-ok, etc.)
- `plugins/simulator/overrides.yaml`: Runtime overrides for simulated metrics
- `plugins/simulator/metrics_full.yaml`: Full metrics catalog for simulator
- `plugins/simulator/metrics_slurm.yaml`: Slurm metrics catalog for simulator
- `plugins/slurm/node_mapping.yaml`: Optional mapping from Slurm node names to topology instance names

### Simulator

**Location**: `tools/simulator/`

A Python service that generates **realistic Prometheus metrics** for testing without real hardware.

**Simulator hostname**: `simulator:9000` (Docker internal). From host: `http://localhost:9000`.

**Features:**
- Reads topology to generate targets (instances, racks)
- Configurable scenarios (demo-small, full-ok, random failures)
- Multi-metric bundles (node, IPMI, storage, infrastructure, Slurm)
- Deterministic seeding for repeatable demos
- Failure injection controls (per metric + per scope)
- Runtime overrides via API (force node down, rack failure, temperature spike)

Prometheus scrapes the simulator, and the backend queries Prometheus exactly like production.

## Data Model

### Topology Hierarchy

```
Site → Room → Aisle → Rack → Device → Instance
```

- **Site**: A physical location (datacenter). Optional: lat/lon for world map.
- **Room**: A room within a site. Can have layout metadata (grid, compass, door markers) for floor plans.
- **Aisle**: A row of racks within a room. Ordered list of rack IDs.
- **Rack**: A physical rack (U height, optional rack template for infrastructure).
- **Device**: A piece of hardware in a rack (server, switch, chassis). References a device template.
- **Instance**: Prometheus identity (node name) for a device or compute unit. Can be:
  - **Pattern**: `"compute[001-004]"` → expands to compute001, compute002, compute003, compute004
  - **Explicit list**: `["compute001", "compute002", "compute003"]`
  - **Slot map**: `{1: "compute001", 2: "compute002", 3: "compute003"}`

**IMPORTANT**: `nodes` is a deprecated alias for `instance`. New configs should use `instance`.

### View Model Constraints

- Every ID must be unique within its scope
- Device placements must not overlap within a rack face (U collision detection)
- Device height must fit rack bounds
- Node slots must match device layout (when layout is split into matrices)
- Telemetry identity must be resolvable from instance/nodeset patterns

### Templates

Templates define hardware characteristics and are **reused across the topology** to avoid repetition.

#### DeviceTemplate
Defines device dimensions (U height), type (Server/Switch/Storage/PDU), and physical layout:
- `layout`: Front view grid (e.g., 2x2 matrix for 4-node chassis)
- `rear_layout`: Rear view grid (optional)
- `rear_components`: Rear components (PSUs, fans, IO modules)
- `checks`: List of check IDs to run for this device type
- `metrics`: List of metric IDs from the metrics library

#### RackTemplate
Defines rack dimensions and built-in infrastructure:
- `infrastructure.rear_components`: Back-mounted equipment (power banks, cable management)
- `infrastructure.rack_components`: Side-mounted components (PDUs on left/right rails, HMC, RMC)
- `checks`: List of check IDs to run for this rack type

#### RackComponentTemplate
Defines rack-level components (PDUs, switches, cooling):
- `type`: pdu, switch, hmc, rmc, cooling
- `location`: side, rear, front
- `u_height`: Height in rack units
- `checks`: List of check IDs to run for this component
- `metrics`: List of metric IDs from the metrics library

### Health Checks

Health checks are defined in `config/checks/library/*.yaml` and consist of:

- **id**: Unique check identifier (e.g., `node_up`, `ipmi_temp_warn`)
- **kind**: Device type filter for UI grouping (server, switch, storage, pdu, cooling)
- **scope**: Evaluation scope — `node`, `chassis`, or `rack`
- **expr**: PromQL query with placeholders (`$instances`, `$chassis`, `$racks`, `$jobs`)
- **output**: `bool` or `numeric`
- **rules**: List of threshold rules mapping values to severities (OK, WARN, CRIT, UNKNOWN)

**Planner Integration:**
- The **TelemetryPlanner** replaces placeholders with actual IDs from topology
- Queries are batched to avoid per-device query explosion
- Results are cached based on `planner.cache_ttl_seconds`
- Template-scoped: Only checks referenced by templates are executed (if no checks on template → no checks run)

**Health States:**
- **OK**: All checks pass
- **WARN**: At least one warning-level check fails
- **CRIT**: At least one critical-level check fails
- **UNKNOWN**: No data or check error

**Aggregation:**
- Node → Chassis → Rack → Room → Site
- Max severity wins (CRIT > WARN > UNKNOWN > OK)

### Slurm Integration

Rackscope supports **Slurm-specific views** for HPC clusters:

- **Slurm Wallboard**: Compact aisle view mapping Slurm node states to rack layout
- **Cluster Overview**: Aggregate status + severity distribution
- **Partitions Dashboard**: Per-partition status breakdowns
- **Node List**: Flat list with topology context (site/room/rack/device)
- **Alerts Dashboard**: List of WARN/CRIT nodes for triage

**Configuration** (in `app.yaml`):
- `slurm.metric`: Metric name (default: `slurm_node_status`)
- `slurm.label_node`: Node label (default: `node`)
- `slurm.label_status`: Status label (default: `status`)
- `slurm.label_partition`: Partition label (default: `partition`)
- `slurm.status_map`: Mapping of Slurm statuses to OK/WARN/CRIT
- `slurm.mapping_path`: Optional YAML mapping Slurm node names to topology instances

**Device Role Filtering:**
Templates can define a `role` field (compute, visu, login, etc.) and the Slurm view can filter by role.

## Key Design Principles (from AGENTS.md)

These principles are **NON-NEGOTIABLE** and must be followed **strictly**:

### Core Principles
- **Simplicity over cleverness**: Keep solutions straightforward and explicit
- **Explicit over implicit**: No magic configuration
- **File-based configuration first**: YAML is the source of truth
- **Incremental development**: Small, focused changes
- **No premature optimization**: Build solid core first
- **No speculative features**: Only implement what is explicitly requested
- **No tight coupling**: To external tools (Grafana, NetBox, etc.)

### Scope Control

**Agents MUST NOT:**
- Introduce a mandatory database
- Introduce direct SNMP/Redfish/hardware access
- Replace Prometheus, Alertmanager, or Grafana
- Add features not explicitly requested
- Rewrite large parts of the codebase without instruction
- Mix multiple concerns in a single change

**Agents SHOULD:**
- Keep changes minimal and focused
- Make changes reversible
- Propose alternatives instead of enforcing choices

### Configuration Rules

**Agents MUST:**
- Never embed configuration implicitly in code
- Never hardcode environment-specific values
- Always validate configuration inputs
- Prefer segmented file layouts over monolithic files
- Use templates to reduce duplication

### Performance & Telemetry

**Prometheus query explosion MUST be avoided.**

**Agents MUST:**
- Prefer vector queries over per-device queries
- Use aggregation and grouping
- Add caching where appropriate
- Never generate one query per device per refresh

**Example**: Instead of querying `up{instance="compute001"}` for each node, use:
```promql
up{job="node", instance=~"compute001|compute002|compute003|..."}
```

The **TelemetryPlanner** handles this batching automatically.

### UI/UX Rules

Target audience: NOC operators, N1/N2 sysadmins, MCO teams.

**Agents MUST:**
- Prioritize fast visual comprehension
- Support dark mode as first-class (default for NOC)
- Use color + icons/text (color is not the only indicator for accessibility)
- Keep animations minimal and functional

**Agents MUST NOT:**
- Introduce heavy visual effects
- Build "dashboard-like" layouts (this is not Grafana)
- Depend on Grafana UI components

### Development Practices

- **Small commits, single intent per commit**
- **English for code, comments, and commit messages**
- **No dead code or commented-out code blocks**
- **Explicit error handling** with clear log messages
- **Run `make lint` after changes** to catch syntax/lint errors early
- **Validate with Docker Compose stack** regularly (check logs, rebuild when needed)

### AI-Specific Rules

**Agents MUST:**
- Respect the current design documents (ARCHITECTURE/ and docs/)
- Avoid context bloat
- Not invent requirements
- Not silently change APIs or data models
- Keep public docs in `docs/` updated as phases advance

**If something is unclear: ASK before implementing.**

## Development Workflow

### 🚀 Current Status: Road to Beta

**Documentation is now a first-class deliverable. Every user-facing feature MUST be reflected in the Docusaurus site (`website/docs/`) in the same commit or PR that ships it.**

#### Documentation rules (NON-NEGOTIABLE from beta onwards)

1. **New feature → update the relevant doc page before committing.** If no page exists yet, create one and add it to `sidebars.js`.
2. **Changed behaviour → update the doc.** Config key renamed, API changed, UI reworked — the doc must match reality.
3. **New config field → document it.** Every YAML key added to `app.yaml`, a template, a plugin config, or a metrics catalog must appear in the admin guide or the relevant reference page.
4. **New API endpoint → update `api-reference/`.** Route, method, parameters, response shape.
5. **Developer-facing change** (new hook, new registry, new plugin API) → update or create a page under `architecture/`.

#### Doc pages to keep in sync

| What changed | Doc file to update |
|---|---|
| New UI view or page | `user-guide/views.md` or a new `user-guide/*.md` |
| New dashboard widget | `user-guide/dashboard.md` + `architecture/dashboard-widgets.md` |
| New editor | `user-guide/editors.md` |
| New setting in Settings UI | `admin-guide/settings-ui.md` |
| New `app.yaml` key | `admin-guide/app-yaml.md` |
| New template field | `admin-guide/templates.md` |
| New health check field | `user-guide/health-checks.md` |
| New API endpoint | `api-reference/*.md` |
| Simulator change | `plugins/simulator.md` |
| Slurm plugin change | `plugins/slurm.md` + `user-guide/slurm.md` |
| New plugin | `plugins/` new page + `sidebars.js` |
| Frontend architecture change | `architecture/frontend.md` |
| Backend architecture change | `architecture/backend.md` |

#### Commit message convention for doc updates

- If code + doc ship together: single commit, e.g. `feat(slurm): wildcard node mapping + docs`
- If doc is a follow-up: `docs(<scope>): update <page> for <feature>`

### Current Status: v1.0 → Beta

**All phases complete** (1 through 9):

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Backend Router Split | ✅ COMPLETE |
| 2 | Dependency Injection | ✅ COMPLETE |
| 3 | Service Layer | ✅ COMPLETE |
| 4 | Logging & Error Handling | ✅ COMPLETE |
| 5 | Test Coverage (36% → 66%) | ✅ COMPLETE |
| 6 | Backend Plugin Architecture | ✅ COMPLETE |
| 6.5 | Metrics Library System | ✅ COMPLETE |
| 7 | Frontend Rebuild (cosmos → app/) | ✅ COMPLETE |
| 8 | Performance Optimizations | ✅ COMPLETE |
| 9 | Documentation & Cleanup | ✅ COMPLETE |

**Current metrics** (post-Phase 9):
- ✅ **362 tests passing**
- ✅ **0 mypy type errors**
- ✅ All linters passing (ruff, eslint, stylelint, prettier)
- ✅ frontend/src/app/ (migration from cosmos/ complete)

### Next Features (post v1.0)

Planned improvements after v1.0 release:

- **TanStack Query migration**: Replace manual fetch + state management with server-state caching (staleTime, refetchInterval, optimistic updates)
- **Backend performance**: Dict-indexed topology lookup (O(1) vs O(n) scan), service-level cache layer, PromQL query deduplication
- **Auth hardening**: RBAC roles, production-grade JWT, session management
- **Import adapters**: NetBox, RacksDB, BlueBanquise importers

### Standard Development Workflow

1. **Read AGENTS.md** for strict rules and project context
2. **Run the stack** with `make up` and verify services are healthy
3. **Make focused changes** (small commits, single intent)
4. **Run linters** with `make lint` to catch issues early
5. **Test manually** using the UI at `http://localhost:5173`
6. **Add tests** for new features and run `make test`
7. **Update Docusaurus docs** — see the doc rules above. Every user-facing change ships with its doc update.
8. **Validate with Docker Compose stack** (check logs with `make logs`, rebuild with `make build` when needed)
9. **Never commit ARCHITECTURE/ files** (private design documents)

## Testing

Tests are located in `tests/` and use pytest:
- `test_api.py`: API endpoint tests
- `test_model.py`: Pydantic model validation tests
- `test_planner.py`: Telemetry planner tests

Run tests with:
```bash
make test
# or directly:
docker compose -f docker-compose.dev.yml exec backend pytest
```

## Common Tasks

### Adding a New API Endpoint

1. Add the endpoint function to the relevant router in `src/rackscope/api/routers/`
2. Use Pydantic models for request/response validation
3. Access global state via FastAPI dependencies: `get_topology()`, `get_catalog()`, etc.
4. For writes, reload global state after modifying YAML files
5. Update the frontend API client in `frontend/src/services/api.ts`
6. Add a UI component or page to consume the endpoint
7. Test the endpoint with the API docs at `http://localhost:8000/docs`

### Adding a New Health Check

1. Create or edit a YAML file in `config/checks/library/`
2. Define the check structure:
   ```yaml
   checks:
     - id: my_check_id
       name: "My Check Name"
       kind: server  # or switch, storage, pdu, cooling
       scope: node   # or chassis, rack
       expr: "my_metric{instance=~\"$instances\"}"
       output: bool  # or numeric
       rules:
         - op: "=="
           value: 0
           severity: CRIT
   ```
3. Reference the check in a device or rack template via the `checks: [my_check_id]` field
4. Restart the backend to reload checks: `make restart` or `docker compose -f docker-compose.dev.yml restart backend`
5. Verify the check appears in the Checks Library page

### Adding a New Device Template

1. Create a YAML file in `config/templates/devices/{type}/my-device.yaml`
2. Define the template structure:
   ```yaml
   templates:
     - id: my-device-id
       name: "My Device Name"
       type: server  # or switch, storage, pdu
       u_height: 2
       layout:
         type: grid
         rows: 2
         cols: 2
         matrix: [[1, 2], [3, 4]]  # Visual slot mapping
       checks:
         - node_up
         - ipmi_temp_warn
       metrics:
         - node_temperature
         - node_power
   ```
3. Use the template in rack definitions via `template_id: my-device-id`
4. Restart the backend or use the Template Editor UI

### Modifying the Topology

**Option 1: Direct File Editing**
1. Edit YAML files in `config/topology/`
2. Restart the backend: `make restart` or `docker compose -f docker-compose.dev.yml restart backend`

**Option 2: Visual Editors (Recommended)**
1. Use the **Topology Editor** at `http://localhost:5173/editors/topology`
2. Use the **Rack Editor** at `http://localhost:5173/editors/rack`
3. Changes are saved via API and reloaded automatically

### Working with the Simulator

1. Enable demo mode in `config/app.yaml`:
   ```yaml
   features:
     demo: true
   ```
2. Select a scenario:
   ```yaml
   simulator:
     scenario: demo-small  # or full-ok, random-demo-small
   ```
3. Add overrides via Settings UI or API:
   ```bash
   curl -X POST http://localhost:8000/api/simulator/overrides \
     -H "Content-Type: application/json" \
     -d '{"instance": "compute001", "metric": "up", "value": 0, "ttl_seconds": 0}'
   ```
4. Clear overrides:
   ```bash
   curl -X DELETE http://localhost:8000/api/simulator/overrides
   ```

## Environment Variables

- `RACKSCOPE_APP_CONFIG`: Path to `app.yaml` (default: `config/app.yaml`)
- `RACKSCOPE_CONFIG_DIR`: Base config directory (fallback: `config`)
- `RACKSCOPE_CONFIG`: Path to topology root (fallback if no app.yaml)
- `RACKSCOPE_TEMPLATES`: Path to templates directory (fallback if no app.yaml)
- `RACKSCOPE_CHECKS`: Path to checks library (fallback if no app.yaml)

## UI Access Points

- **Main UI**: http://localhost:5173
- **World Map**: Overview of all sites with geolocation
- **Room Views**: Floor plan with racks (color-coded by health)
- **Rack Views**: Front/rear views with devices and chassis grids
- **Device Views**: Device detail with instance tabs
- **Slurm Wallboard**: HPC-specific cluster overview (compact aisle views)
- **Slurm Dashboards**: Cluster Overview, Partitions, Node List, Alerts
- **Visual Editors**:
  - Topology Editor (`/editors/topology`)
  - Rack Editor (`/editors/rack`)
  - Template Editor (`/editors/templates`)
  - Checks Library Editor (`/editors/checks`)
- **Settings**: Application configuration UI (`/editors/settings` or `/settings`)

## Important Files to Reference

### At Project Root (Auto-detected by AI)
- **AGENTS.md**: **STRICT RULES** for AI-assisted development (READ FIRST)
- **CLAUDE.md**: This file - Claude Code specific guidance
- **GEMINI.md**: Gemini CLI working agreement
- **prompt.md**: Repository bootstrap prompt

### Standard Project Files
- **README.md**: Project readme
- **CONTRIBUTING.md**: Contribution guidelines
- **CHANGELOG.md**: Project changelog
- **pyproject.toml**: Python dependencies and build configuration
- **frontend/package.json**: Frontend dependencies and scripts
- **config/app.yaml**: Central application configuration

### Architecture Documentation (ARCHITECTURE/)
- **ARCHITECTURE/README.md**: Index of all architecture documentation
- **ARCHITECTURE/ARCHITECTURE.md**: High-level architecture overview
- **ARCHITECTURE/NOTES.md**: Working notes
- **ARCHITECTURE/plans/CONSOLIDATED_ROADMAP.md**: Development roadmap (all phases)
- **ARCHITECTURE/plans/PLUGIN_ARCHITECTURE.md**: Plugin system design
- **ARCHITECTURE/reference/CHECKS_LIBRARY.md**: Health check system
- **ARCHITECTURE/reference/VIEW_MODEL.md**: View model specification
- **ARCHITECTURE/reference/TESTING.md**: Testing strategy
- **ARCHITECTURE/reference/PLUGIN_DEVELOPMENT.md**: Plugin development guide
- **ARCHITECTURE/decisions/ADR-007-METRICS-LIBRARY.md**: Metrics library architecture decision

### User Documentation (docs/)
- **docs/API_REFERENCE.md**: REST API documentation
- **docs/ADMIN_GUIDE.md**: Configuration and deployment guide
- **docs/USER_GUIDE.md**: End-user documentation
- **docs/SIMULATOR.md**: Simulator configuration and usage

### Docusaurus Documentation Site (website/)
- **website/**: Full documentation site (Docusaurus 3)
- `make docs` — starts the docs container (http://localhost:3001), hot-reload on content changes
- `make docs-build` — builds the static site inside the container
- `make docs-logs` — follow docs container logs
- The `docs` service is part of `docker-compose.dev.yml` (port 3001)
- For GitHub Pages deployment: `.github/workflows/deploy-docs.yml` (activate via repo Settings → Pages)

## Critical Implementation Notes

### Global State Management

The backend uses **global state** that is reloaded when files are modified:

```python
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
METRICS_LIBRARY: Optional[MetricsLibrary] = None
```

**When modifying YAML files via API:**
1. Write YAML using `dump_yaml()` from `model/loader.py`
2. Reload global state: `TOPOLOGY = load_topology(paths.topology)`
3. Return success response

### Telemetry Planner

The **TelemetryPlanner** (`telemetry/planner.py`) is critical for performance:

- Collects all node/chassis/rack IDs from topology
- Batches IDs into PromQL queries (respects `max_ids_per_query`)
- Replaces placeholders: `$instances`, `$chassis`, `$racks`, `$jobs`
- Caches snapshots based on `planner.cache_ttl_seconds`
- Returns a `PlannerSnapshot` with node_states, chassis_states, rack_states, node_alerts

**Usage:**
```python
targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
rack_state = snapshot.rack_states.get(rack_id, "UNKNOWN")
```

### Conditional Metrics Loading

**CRITICAL**: To avoid performance degradation, metrics are loaded **conditionally** based on view requirements.

The `/api/racks/{rack_id}/state` endpoint accepts an `include_metrics` parameter:

**Performance Impact:**
- `include_metrics=false` (default): ~30-40ms response time
  - Returns only health states and checks
  - Suitable for rack grids, lists, and overview pages
- `include_metrics=true`: ~743ms response time
  - Returns health + temperature, power, PDU metrics (20+ Prometheus queries)
  - Required for detail views with metric displays

**View-Level Guidelines:**
- **RoomPage (rack grid)**: ❌ No metrics - displays health states only
- **RoomPage (selected rack panel)**: ✅ With metrics - displays temp/power/PDU
- **RackPage (detail view)**: ✅ With metrics - displays all metrics + components
- **DevicePage (detail view)**: ✅ With metrics - displays instance-level metrics

**Template-Driven Metrics:**
Metrics are defined in templates, not hardcoded:
- `DeviceTemplate.metrics`: List of metric IDs from the metrics library
- `RackComponentTemplate.metrics`: List of metric IDs from the metrics library
- Completely modular - add/remove metrics per template as needed

### Frontend Proxy

The Vite dev server proxies `/api` requests to the backend to avoid CORS issues.

**Frontend API calls:**
```typescript
// frontend/src/services/api.ts
export const api = {
  getRooms: () => fetch('/api/rooms').then(r => r.json()),

  // Conditional metrics loading (default: false for performance)
  getRackState: (rackId: string, includeMetrics: boolean = false) => {
    const url = `/api/racks/${rackId}/state${includeMetrics ? '?include_metrics=true' : ''}`;
    return fetchWithCache(url, `rack.${rackId}.state${includeMetrics ? '.metrics' : ''}`, 5000);
  },

  // Room state with short cache TTL
  getRoomState: (roomId: string) => {
    return fetchWithCache(`/api/rooms/${roomId}/state`, `room.${roomId}.state`, 5000);
  },
}
```

### Dark Mode is First-Class

**Always test UI changes in both light and dark themes.**

The theme is managed by `AppConfigContext` and persisted to `localStorage` under the `rackscope.*` namespace:
- Dark mode is the **default** (for NOC environments)
- Light mode is fully supported
- Accent color is customizable

## Phase Progression

Rackscope follows a phased development plan:

### Completed Phases
- **Phase 0**: ✅ Foundations (name, decisions, view model)
- **Phase 1**: ✅ Backend Router Split (organized API endpoints)
- **Phase 2**: ✅ Dependency Injection (clean architecture)
- **Phase 3**: ✅ Service Layer (business logic separation)
- **Phase 4**: ✅ Logging & Error Handling (structured logging, error tracking)
- **Phase 5**: ✅ Test Coverage (36% → 66%, 251 tests)
- **Phase 6**: ✅ Backend Plugin Architecture (311 tests)
  - Generic metrics collection (template-driven, removed 105 lines of hardcoded queries)
  - Plugin foundation (RackscopePlugin, PluginRegistry, menu system)
  - SimulatorPlugin (demo mode with overrides)
  - SlurmPlugin (workload manager integration)
- **Phase 6.5**: ✅ Metrics Library System (39 metrics, query_range time-series)
  - MetricDefinition model + MetricsLibrary
  - `/api/metrics/library` and `/api/metrics/data` endpoints
  - Simulator refactored to use metrics library dynamically
  - ADR-007-METRICS-LIBRARY.md
- **Phase 7**: ✅ Frontend Rebuild (cosmos → app/ migration complete)
  - `frontend/src/cosmos/` → `frontend/src/app/`
  - React Router at `/` (no prefix)
  - localStorage: `rackscope.*` keys
  - CSS classes: `.rs-*` namespace
  - ApexCharts replacing Chart.js
  - Dynamic plugin menu via `/api/plugins/menu`
- **Phase 8**: ✅ Performance Optimizations
  - Backend dict indexes for O(1) topology lookups
  - Frontend useMemo / useCallback optimizations
  - Bundle size reduction
- **Phase 9**: ✅ Documentation & Cleanup
  - Docusaurus 3 website (`website/`)
  - CLAUDE.md, README.md, CHANGELOG.md updated
  - 0 mypy type errors
  - 362 tests passing

## Code Quality Tools

### Test Coverage

Generate test coverage report:
```bash
make coverage
```

**Target**: 70%+ overall coverage

### Type Checking

Run mypy type checker:
```bash
make typecheck
```

**Configuration**: See `mypy.ini`

**Target**: 0 type errors (achieved).

### Complexity Analysis

Check code complexity:
```bash
make complexity
```

**Target**: Average complexity < 10 per module

### All Quality Checks

Run all quality checks at once:
```bash
make quality
```

This runs: `lint`, `typecheck`, `complexity`, and `coverage`.

---

## Notes

### Architecture & Documentation
- **ARCHITECTURE/ directory**: Contains all architectural documentation (decisions, phases, plans, references)
- **Architecture docs are organized**: See `ARCHITECTURE/README.md` for complete index
- **Docusaurus site**: `website/` — run `make docs` to start, `make docs-build` to build

### Development
- **English only**: Code, comments, and commit messages must be in English
- **Small commits, single intent per commit**
- **Run `make lint` after changes** to catch syntax/lint errors early
- **Validate with Docker Compose stack** regularly (check logs, rebuild when needed)

### Backend & Telemetry
- The backend uses **global state** which is reloaded when files are modified via API endpoints
- The **telemetry planner** caches snapshots based on `planner.cache_ttl_seconds` to avoid excessive Prometheus queries
- **Prometheus query optimization is critical**: The planner batches queries to avoid per-device explosion
- **Conditional metrics loading**: Use `include_metrics=false` (default) for performance
  - Without metrics: ~30-40ms response time (health states only)
  - With metrics: ~743ms response time (health + temperature/power/PDU)
  - RoomPage grid, lists: ❌ No metrics
  - RackPage, DevicePage, Room panel: ✅ With metrics
- **Template-driven metrics**: Metrics defined via metrics library YAML — no hardcoded queries
- **Simulator hostname**: `simulator:9000` (Docker) — not `localhost:9000` in container configs

### Frontend
- The frontend **proxies API calls** through Vite dev server to avoid CORS issues
- **Dark mode is first-class**: Always test UI changes in both light and dark themes
- **Route prefix**: All routes at `/` (no `/cosmos` prefix)
- **localStorage**: `rackscope.*` namespace (not `cosmos-*`)
- **CSS classes**: `.rs-*` namespace (not `.cosmos-*`)

### Integrations
- **Slurm integration is optional**: Only activated when `slurm` config section is present
- **Simulator integration is optional**: Only activated when `features.demo: true`
