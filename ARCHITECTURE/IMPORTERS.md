# IMPORTERS.md (Private) — Philosophy v0.1
Importers/adapters convert external inventory sources into the View Model files.

## Principles
- Core app remains CMDB-agnostic
- Importers are separate tools/scripts (can live in /tools later)
- Output is View Model YAML/JSON
- Users can customize templates/checks after import

## Supported sources (planned)
- BlueBanquise inventory (Ansible/nodesets)
- RacksDB (file CMDB)
- NetBox (API)

## Import strategy (phased)
- Bootstrap import:
  - generate sites/rooms/racks and base devices
  - generate template skeletons when possible
- Update import:
  - regenerate “layout” while preserving user overrides
  - merge strategy must be explicit (future ADR)

## Mapping rules (must be defined)
- identity key mapping (device_id/instance/hostname)
- rack/room/site label conventions (recommended)
