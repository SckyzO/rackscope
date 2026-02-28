# Rackscope

[![Tests](https://img.shields.io/badge/tests-362%20passing-brightgreen.svg)](tests/)
[![Python](https://img.shields.io/badge/python-3.12%2B-blue.svg)](pyproject.toml)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](frontend/package.json)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6.svg)](frontend/tsconfig.json)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()

**Prometheus-first physical infrastructure monitoring for data centers and HPC environments.**
Visualize the full hierarchy — Site → Room → Aisle → Rack → Device — using live Prometheus metrics, with zero database requirements and full GitOps compatibility.

---

## Features

- **Prometheus-First**: live PromQL queries, no internal time-series DB
- **File-Based Topology**: YAML is the source of truth, GitOps-friendly
- **Template-Driven**: define hardware once, reuse across racks
- **Physical Views**: world map, room layout, front/rear rack views, device drill-down
- **Visual Editors**: topology, rack, template, checks, and settings editors
- **HPC Native**: Twins/Quads/Blades, liquid cooling, dense chassis, Slurm integration
- **Plugin Architecture**: optional Slurm and Simulator plugins, extensible for new integrations
- **Metrics Library**: 39+ pre-defined metrics with display configuration (units, thresholds, chart type)
- **Modern UI**: React 19 + Tailwind CSS v4, dark/light mode, custom accents, NOC-ready

---

## Quick Start (Docker)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SckyzO/rackscope.git
   cd rackscope
   ```

2. **Start the full stack**:
   ```bash
   make up
   ```
   Or manually: `docker compose -f docker-compose.dev.yml up -d --build`

3. **Open the interfaces**:

   | Service | URL |
   |---------|-----|
   | **Web UI** | http://localhost:5173 |
   | **API Docs** | http://localhost:8000/docs |
   | **Prometheus** | http://localhost:9090 |
   | **Simulator** | http://localhost:9000 |

That's it. The stack starts with a demo topology and simulated metrics so you can explore immediately.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  YAML Config (topology, templates, checks, metrics)     │
│  config/topology/   config/templates/   config/checks/  │
└────────────────────────────┬────────────────────────────┘
                             │ load
                    ┌────────▼────────┐
                    │  Backend (8000)  │  FastAPI + Python 3.12
                    │  - Topology API  │  Plugin: Slurm, Simulator
                    │  - Health engine │  TelemetryPlanner (batched PromQL)
                    └────────┬────────┘
                             │ PromQL queries
              ┌──────────────▼──────────────┐
              │     Prometheus (9090)        │
              └──────────────┬──────────────┘
                             │ scrapes
              ┌──────────────▼──────────────┐
              │  Simulator (9000) or        │
              │  real infrastructure        │
              └─────────────────────────────┘
                             ▲
                    ┌────────┴────────┐
                    │ Frontend (5173)  │  React 19 + Tailwind v4
                    │ - Physical views │  ApexCharts, Leaflet, Monaco
                    │ - Visual editors │  Dark mode first-class
                    └─────────────────┘
```

**Physical Hierarchy**: `Site → Room → Aisle → Rack → Device → Instance`

---

## Configuration

| File/Directory | Purpose |
|----------------|---------|
| `config/app.yaml` | Central config: Prometheus URL, paths, features, plugin settings |
| `config/topology/` | Infrastructure definition (sites, rooms, racks, devices) |
| `config/templates/` | Hardware templates (device types, rack blueprints) |
| `config/checks/library/` | Health check definitions (PromQL expressions + rules) |
| `config/metrics/library/` | Metric definitions (display config, thresholds, chart type) |

Example device definition:
```yaml
- id: r01-01-c01
  name: Compute 01
  template_id: bs-x440-a5
  u_position: 1
  instance: compute[001-004]   # expands to compute001..compute004
```

---

## How It Works

You describe your infrastructure in **YAML** (sites, rooms, racks, templates).
The **backend** loads those files, plans PromQL queries in batches, and exposes a REST API.
The **frontend** renders visual rack/room views with live health states from Prometheus.

**YAML → Backend (query planner) → Prometheus → Frontend** — no database, no agent.

---

## Metrics Simulator

A built-in simulator generates realistic Prometheus metrics for testing without real hardware:

- Simulate up/down nodes, warning/critical states
- Inject IPMI temperature spikes, storage failures, PDU load
- Runtime overrides via API or Settings UI
- Deterministic seeding for reproducible demos

Enable it in `config/app.yaml`:
```yaml
features:
  demo: true
simulator:
  scenario: demo-small   # or full-ok, random-demo-small
```

---

## Development Commands

```bash
make up           # Start full stack (backend, frontend, simulator, prometheus)
make down         # Stop stack
make restart      # Restart services (reload config)
make build        # Rebuild containers
make logs         # Follow all logs
make lint         # Run all linters (ruff + eslint + stylelint + prettier)
make test         # Run backend tests (362 tests)
make typecheck    # Run mypy (0 errors)
make coverage     # Generate coverage report
make quality      # Run lint + typecheck + complexity + coverage
make docs         # Start Docusaurus documentation site (http://localhost:3001)
make docs-build   # Build static documentation site
```

All commands run **inside Docker containers** — no local Python or Node.js required.

---

## Plugin System

Rackscope uses a plugin architecture to separate optional features from the core:

- **Core**: topology visualization, health checks, editors, REST API
- **SlurmPlugin**: HPC workload manager integration (node states, partitions, job tracking)
- **SimulatorPlugin**: demo mode with metric overrides and failure injection

Plugins register their own routes and contribute menu sections to the frontend dynamically.

---

## Linting & Quality

```bash
make lint        # ruff + eslint + stylelint + prettier
make typecheck   # mypy — target: 0 errors (currently achieved)
make test        # pytest — 362 tests
make coverage    # 70%+ target
```

---

## Documentation

Full documentation is available in the `website/` directory (Docusaurus 3):

```bash
make docs   # → http://localhost:3001
```

Or browse the source docs:
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Simulator](docs/SIMULATOR.md)
- [Roadmap](ARCHITECTURE/plans/CONSOLIDATED_ROADMAP.md)

---

## Contributing

Contributions are welcome.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before opening a PR.

---

## License

MIT — see [LICENSE](LICENSE).
