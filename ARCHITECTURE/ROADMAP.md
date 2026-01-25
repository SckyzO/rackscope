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
- [ ] Checks library (separate file) with scopes (node/chassis/rack)
- [ ] PromQL planner (vector queries, no per-node queries)
- [ ] Cache + dedup + TTL strategy (60s refresh)
- [ ] UNKNOWN handling + severity aggregation rules

---

## Phase 4 — Config & Segmentation (Priority)
**Goal:** Make topology and config scalable for large DCs.

- [ ] Add `config.yaml` (global config: paths, identity label, refresh/caches)
- [ ] Set refresh defaults to >= 60s (config-driven)
- [ ] Segment topology files by site/room/rack
- [ ] Support multi-DC topology (future world map view)
- [ ] Update View Model spec (nodes, chassis, selectors, scopes)
- [ ] Settings UI (full app configuration — entire app configurable):
  - [ ] Prometheus endpoints + auth (optional)
  - [ ] Identity mapping (instance/host/node) + label overrides
  - [ ] Refresh policies (room/rack/global)
  - [ ] Cache TTL/dedup policies
  - [ ] UNKNOWN/aggregation policies
  - [ ] Paths (topology/templates/checks)
  - [ ] Feature toggles (notifications, playlist, offline)
  - [ ] Validation + save/reload workflow
- [ ] Refactor simulator (multi-metric, topology-driven, demo-ready)

---

## Phase 5 — Visual Completion
**Goal:** Complete physical rendering (front/rear/infra).

- [ ] Rear view implementation:
  - [ ] normalize `rear_layout` in device templates
  - [ ] render PSUs, fans, rear connectors in UI
  - [ ] render zero-U side attachments (PDU rails) aligned to U scale
- [ ] Active infrastructure:
  - [ ] connect HMC/PMC to real Prometheus metrics
  - [ ] add gauges/charts for infra components

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
- [ ] Redesign home dashboard with full alert integration
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
