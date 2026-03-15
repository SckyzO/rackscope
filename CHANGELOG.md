# Changelog

All notable changes to Rackscope will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/)

---

## [1.0.0-beta] — 2026-03

> First public release of Rackscope.

### Physical Infrastructure Views

- **World Map** — site overview with health markers and geolocation, layout toggle (Stacked / Split)
- **Room View** — floor plan with rack grid, zoom/fit controls, customizable tooltip styles (6 variants)
- **Rack View** — front and rear elevation with device placement, U-collision detection, template-driven
- **Device View** — instance-level drill-down with tabs, live metrics charts, health check results
- **Cluster Overview** — wallboard-style multi-rack view, configurable rack width, drag-and-drop reorder

### Physical Hierarchy

- Full `Site → Room → Aisle → Rack → Device → Instance` hierarchy
- Segmented YAML topology (per-site/room/aisle/rack files) or monolithic single file
- `instance` field expands nodeset patterns: `compute[001-004]` → 4 nodes
- Template-driven hardware: define once, reuse across racks
- Rack component templates (PDUs, HMC, switches, cooling units)

### Health Checks

- PromQL-based health checks with configurable severity rules (OK / Warning / Critical / Unknown)
- Scope levels: `node`, `chassis`, `rack`
- `for:` duration field — alert fires only after condition persists N minutes (debounce)
- `expand_by_label` — per-sub-component checks (e.g., per disk slot on storage arrays)
- Aggregation: max severity wins, propagates from node → chassis → rack → room → site
- Visual Checks Editor with YAML mode, live PromQL test-query

### Dashboard

- Drag-and-drop widget grid (react-grid-layout), configurable per-user
- 20+ built-in widgets: Node Health (HUDTooltip), Severity Donut, Active Alerts, World Map, KPI cards, Slurm cluster, Simulator Status, and more
- Widget title bar alignment setting (left / center)
- URL-based dashboards `/dashboard/:id` — deep-linkable, multi-tab independent
- Playlist integration — include dashboards in NOC rotation

### NOC Features

- **Playlist mode** — automatic rotation through views, configurable intervals, kiosk/fullscreen/split
- **Sound alerts** — per-severity configurable sounds (soft ping, double beep, alert tone, alarm, NOC chime, fire truck siren), mute toggle in notification panel
- **Notification panel** — adaptive height (auto-fit to alert count), red badge, mute toggle
- **Slurm Wallboard** — compact aisle view mapping Slurm node states to rack layout
- Error pages: 500 (overheating rack), 503 (disconnected cable), 403/401 (padlock)

### HPC / Slurm Integration

- Slurm node state monitoring via configurable metric + label mapping
- Views: Overview, Nodes (filterable), Alerts, Partitions, Wallboard
- Node mapping file (wildcard patterns `compute[001-100]` → topology instances)
- Configurable status map (Slurm states → OK / Warning / Critical)
- Device role filtering (`compute`, `visu`, `login`, `io`, `storage`)

### Configuration & Editors

- **Topology Editor** — visual room layout, aisle/rack CRUD, YAML fallback mode
- **Rack Editor** — front/rear device placement, drag-and-drop, U-space validation
- **Template Editor** — device and rack component templates with live preview
- **Checks Editor** — PromQL expression editor with variable substitution and live test-query
- **Metrics Editor** — metric definition management
- **Settings** — Prometheus connection, planner config, feature flags, auth, map defaults, appearance, severity labels, notification sounds

### Metrics Library

- 39 pre-defined metric definitions (temperature, power, CPU, storage, network, infrastructure)
- Per-metric display config: unit, chart type, color, warn/crit thresholds, time ranges
- Template-driven: assign metrics to device/rack templates via YAML

### Security

- JWT-based authentication (configurable, disabled by default)
- bcrypt password hashing, configurable password policy
- Setup wizard with permanent dismissal (writes to `app.yaml`)
- Automated security audit pipeline: `make security` (bandit + npm audit + pip-audit)
- GitHub Actions workflow: security scan on every push + weekly CVE check

### Plugin Architecture

- `RackscopePlugin` abstract base — register routes, contribute menu sections, lifecycle hooks
- `SimulatorPlugin` — demo mode with realistic metric generation, scenario switching, runtime overrides, incident injection
- `SlurmPlugin` — Slurm workload manager integration
- Plugin config priority chain: dedicated file → `app.yaml plugins.{id}` → legacy fallback

### Developer

- REST API fully documented (Swagger UI at `/docs`)
- 683 backend tests (pytest), 90% code coverage
- `make test-v`, `make test-k K=keyword`, `make test-file F=path`, `make ci`
- mypy type checking: 0 errors
- Docusaurus documentation site (`make docs` → http://localhost:3001)

---

*For questions or issues: https://github.com/SckyzO/rackscope/issues*
