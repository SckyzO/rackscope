# PROMPT_FINAL.md — Start Work (Gemini or Codex)

You are working in the `rackscope` repository.

Project name:
- short: rackscope
- long: Rack & Server Monitoring Dashboard

## Non-negotiable rules
- Work incrementally; small, reversible changes.
- English for code/comments/commit messages.
- Do NOT introduce a mandatory database.
- Do NOT implement direct metric collection (no SNMP/Redfish scraping).
- Prometheus/PromQL is the telemetry source of truth.
- Physical topology comes from file-based View Model (YAML/JSON), template-driven.
- Keep architecture boundaries: model -> telemetry -> health -> API -> UI.
- `ARCHITECTURE/` is PRIVATE and must NEVER be committed.

## Current phase
Phase 1 (Viewer MVP) — start with the smallest vertical slice.

## Tasks (checkboxes)
### Repo hygiene
- [ ] Confirm `ARCHITECTURE/` is in `.gitignore`
- [ ] Ensure public docs contain no private info

### Vertical slice v0 (no Prometheus yet)
- [ ] Implement minimal View Model loader for a room with racks (YAML)
- [ ] Add API endpoints:
  - [ ] GET /api/sites
  - [ ] GET /api/rooms
  - [ ] GET /api/rooms/{room_id}/layout
- [ ] Add strict validation with clear errors (file + path)

### Telemetry v0 (stub)
- [ ] Add a telemetry interface returning deterministic dummy states
- [ ] Add:
  - [ ] GET /api/rooms/{room_id}/state
  - [ ] GET /api/racks/{rack_id}/state

### Notes
- Do not implement editors/templates engine yet.
- Keep PromQL grouping design in mind, but do not overbuild now.
