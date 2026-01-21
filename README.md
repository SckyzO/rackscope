# rackscope — Rack & Server Monitoring Dashboard

`rackscope` is a Prometheus-first application providing physical monitoring views of
infrastructure:

- Site / Datacenter
- Room (top-down floor plan)
- Rack (front and rear views)
- Equipment health (servers, chassis, switches, PDUs, cooling/hydraulics)

## Principles
- Prometheus/PromQL is the telemetry source of truth
- Physical topology is NOT stored in Prometheus
- Topology is provided by a file-based View Model (YAML/JSON), template-driven
- CMDB-agnostic: NetBox/RacksDB/BlueBanquise can be imported via adapters
- Operator-first UX (wallboard playlist + notifications)

## Privacy
Internal architecture documents live in `ARCHITECTURE/` and must **never** be committed.
This folder is gitignored by default.

## Status
Bootstrap skeleton (Phase 0).
