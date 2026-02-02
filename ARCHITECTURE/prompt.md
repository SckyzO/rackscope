# prompt.md — Kickstart Prompt (Repository Bootstrap)
This file is intended to be copy/pasted into a coding assistant to bootstrap
the project safely and incrementally.

## Critical rules
- Work incrementally. Small changes. One intent per commit.
- English for code/comments/commit messages.
- DO NOT introduce a mandatory database.
- DO NOT implement direct hardware access (SNMP/Redfish/etc.).
- Prometheus/PromQL is the telemetry source of truth.
- Physical topology is provided by the View Model files (YAML/JSON).
- Keep architecture boundaries: Model -> Telemetry -> Health -> API -> UI.
- The private `ARCHITECTURE/` directory must NEVER be committed.
  - Add it to `.gitignore`
  - Do not reference private content in public docs

## Repository initialization tasks (checkboxes)
- [ ] Initialize repository structure
- [ ] Add `.gitignore` including `ARCHITECTURE/`
- [ ] Add `AGENTS.md` and `GEMINI.md` at repo root
- [ ] Add public `README.md` (no private info)
- [ ] Add minimal `LICENSE` (MIT or Apache-2.0) (choose one)
- [ ] Add `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` (lightweight)
- [ ] Add CI skeleton (lint/test placeholders) (optional, later)

## MVP scope (Phase 1) — Viewer Wallboard (checkboxes)
- [ ] File loader + strict validation for View Model (YAML/JSON)
- [ ] REST API:
  - [ ] layout endpoints (sites/rooms/racks)
  - [ ] state endpoints (room/rack/device)
- [ ] Telemetry adapter (PromQL):
  - [ ] vector queries (no per-device queries)
  - [ ] caching + deduplication
- [ ] Health engine:
  - [ ] OK/WARN/CRIT/UNKNOWN states
  - [ ] aggregation device->rack->room->site
  - [ ] transition detection for notifications
- [ ] Offline snapshots:
  - [ ] store last snapshot
  - [ ] serve stale data with indicator
- [ ] UI viewer:
  - [ ] Room top view (grid)
  - [ ] Rack view front (slotted)
  - [ ] Rack view rear (attachments, minimal)
  - [ ] Playlist mode (rotate rooms)
  - [ ] Notification header (badge + sound + list)
  - [ ] Dark/light themes
  - [ ] Accessibility basics (color + icon)

## Guardrails for performance (checkboxes)
- [ ] Cap total PromQL calls per room refresh (target < 30)
- [ ] Use grouped vector queries by kind/room/site
- [ ] Prefer consuming recording-rule health series if present
- [ ] Rate limit notification sounds

## Deliverables at the end of Phase 1 (checkboxes)
- [ ] Demo with a sample config (one site, one room, two racks)
- [ ] Documented config examples (public, sanitized)
- [ ] Documented deployment (container run)
- [ ] Screenshot/gif of wallboard navigation

## Notes
- Keep the first release intentionally small.
- Add templates and editors only after Phase 1 viewer is stable.