# Roadmap Rackscope (Private)

Status: **Active Development**
Current Phase: **Phase 3 (Telemetry Foundation)**

This roadmap merges the previous checklist into a single source of truth.
Every line is a task; checked items are done.

---

## Phase 0 — Foundations (Decisions)
- [x] Choose final project name
- [x] Decide identity strategy (device_id vs instance vs hostname)
- [x] Freeze View Model v0.1 (entities + constraints)
- [x] Freeze file segmentation strategy (directories + load order)
- [x] Create initial template strategy (inheritance? overrides?)
- [x] Decide refresh policy (room/rack/drilldown)
- [x] Decide offline snapshot behavior

## Phase 1 — Viewer MVP (Wallboard)
- [x] Load View Model from YAML/JSON files
- [x] Room top view renders racks on a grid
- [x] Rack tile shows severity color (OK/WARN/CRIT/UNKNOWN)
- [x] Click rack -> rack view
- [x] Rack front elevation with slotted devices

## Phase 2 — Templates + Density (Completed)
- [x] Template resolution and instantiation (basic)
- [x] Built-in templates (rack, chassis, switch, PDU, cooling)
- [x] Advanced density UI (storage drawers)
- [x] Rack cockpit view (infrastructure layout)
- [x] Metrics simulator (node-level)

---

## Phase 3 — Telemetry Foundation (Current)
**Goal:** Build a scalable, Prometheus-first telemetry layer.

Telemetry:
- [x] Checks library split (folder-based, no monolith):
  - [x] Migrate to `config/checks/library/*.yaml`
  - [x] Remove `config/checks/library.yaml` (no fallback)
  - [x] Loader reads all files in `checks/library/`
  - [x] Keep scopes (node/chassis/rack) + label mappings
- [x] PromQL planner (vector queries, no per-node queries)
- [x] Cache + dedup + TTL strategy (60s refresh)
- [x] UNKNOWN handling + severity aggregation rules

---

## Phase 4 — Config & Segmentation (Priority)
**Goal:** Make topology and config scalable for large DCs.

- [x] Add `config.yaml` (global config: paths, identity label, refresh/caches)
- [x] Set refresh defaults to >= 60s (config-driven)
- [x] Segment topology files by site/room/rack
- [x] Support multi-DC topology (future world map view)
- [x] Update View Model spec (instances, chassis, selectors, scopes)
- [ ] Overview/Home dashboard refactor (single or multi-DC aware):
  - [x] wallboard layout with global status + key KPIs
  - [x] alert integration (summary + top active alerts)
  - [ ] pixel-perfect polish + dark/light parity (deferred to final pass)
- [x] Prometheus latency stats (backend heartbeat + sidebar display)
- [ ] Settings UI (full app configuration — entire app configurable):
  - [x] Prometheus endpoints + auth (optional)
  - [x] Prometheus heartbeat interval + latency settings
  - [x] Identity mapping (instance/host/node) + label overrides
  - [x] Refresh policies (room/rack/global)
  - [x] Cache TTL/dedup policies
  - [x] UNKNOWN/aggregation policies
  - [x] Paths (topology/templates/checks)
  - [x] Feature toggles (notifications, playlist, offline, demo)
  - [x] Notification panel size (max visible alerts)
  - [x] Validation + save/reload workflow
  - [ ] Settings UX refinement (help text, guided flows) — deferred to final pass
- [x] Device alert detail pipeline (device/node alerts in header + tooltips)
- [ ] Refactor simulator (multi-metric, topology-driven, demo-ready):
  - [ ] Rework scenario implementation (deterministic, explicit outcomes)
  - [x] Topology-driven target generation (instances/racks)
  - [x] Multi-metric bundles (node/ipmi/storage/infra)
  - [x] Deterministic seeding (repeatable demos)
  - [x] Failure injection controls (per metric + per scope)
  - [x] Prometheus labels parity (instance/rack/chassis/job)
  - [ ] Export fixtures in config-examples

---

## Phase 5 — Visual Completion
**Goal:** Complete physical rendering (front/rear/infra).

- [ ] Rear view implementation:
  - [x] normalize `rear_layout` in device templates
  - [ ] render PSUs, fans, rear connectors in UI
  - [ ] render zero-U side attachments (PDU rails) aligned to U scale
- [ ] Active infrastructure:
  - [ ] connect HMC/PMC to real Prometheus metrics
  - [ ] add gauges/charts for infra components
- [ ] Global search UX:
  - [x] searchable datacenter/room/aisle/rack/device names
  - [x] highlight matches + keep hierarchy context

---

## Phase 6 — Configuration Editor (Next)
**Goal:** Safe editing of topology, templates, and checks from the UI.

- [ ] Backend writer:
  - [ ] `POST /api/catalog/templates` with validation
  - [ ] safe YAML dumping (structured rewrite)
- [ ] Template designer UI:
  - [ ] visual grid editor for devices
  - [ ] form-based properties editing
- [ ] Topology editor:
  - [ ] drag & drop racks in aisles/rooms
  - [ ] assign templates to empty rack slots

## Phase 7 — Additional Views + Importers
- [ ] World map overview (multi-DC)
- [x] Multi-DC UI support (site selector + per-site room list)
- [ ] Compute grid view
- [ ] Services view
- [ ] Playlist mode (rotate rooms every X minutes)
  - [ ] Header toggle (visible) + tooltip explanation
  - [ ] Settings: enable/disable, interval, mode (rooms only / rooms+racks)
  - [ ] Settings: select rooms/racks + reorder list
  - [ ] UI: full-screen optional + countdown + pause/resume
  - [ ] Persist playlist config (localStorage)
  - [ ] Fallback when targets missing (skip)
- [ ] BlueBanquise exporter -> View Model
- [ ] RacksDB exporter -> View Model
- [ ] NetBox exporter -> View Model

## Phase 8 — Hardening (Optional)
- [ ] Auth (OIDC) optional
- [ ] RBAC optional
- [ ] DB optional (multi-user editor + audit trail only)

---

## Phase 9 — Finalization
- [ ] Design polish pass (pixel-perfect + global dark/light parity)
- [ ] Settings UX refactor (clarify toggles, add guided playlist config)
- [ ] Phase 1 polish:
  - [ ] Rack rear view with attachments (minimal)
  - [ ] Tooltip shows failing reasons (top checks)
  - [ ] Notification header:
    - [ ] badge counter
    - [ ] sound on transitions (configurable)
    - [ ] transition list dropdown
    - [ ] rate limiting
  - [ ] Offline mode:
    - [ ] last snapshot stored
    - [ ] stale indicator when backend unreachable

## Phase 10 — Documentation (Static)
**Goal:** Publish a complete, static documentation set.

- [ ] Consolidate docs into a single static site (structure + navigation)
- [ ] Full Admin Guide (install, config, telemetry, checks, templates)
- [ ] Full User Guide (UI flows, troubleshooting)
- [ ] API Reference (all endpoints + examples)
