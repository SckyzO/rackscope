<div align="center">

# 🔭 Rackscope

**Prometheus-first physical infrastructure monitoring for data centers and HPC environments**

[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue?style=flat-square)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-683%20passing-brightgreen?style=flat-square)](tests/)
[![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen?style=flat-square)](tests/)
[![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black)](frontend/package.json)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange?style=flat-square)](LICENSE)

[📚 Documentation](https://rackscope.dev) · [🐛 Issues](https://github.com/SckyzO/rackscope/issues) · [🚀 Quick Start](#-quick-start)

</div>

---

## What is Rackscope?

Rackscope is a **visualization layer** for your existing Prometheus monitoring stack. It renders your physical infrastructure — servers, racks, rooms, data centers — as interactive views with live health states, without owning a CMDB or collecting metrics itself.

> **It is NOT** a Prometheus replacement, a Grafana plugin, or a CMDB.
> It **complements** your existing stack with physical views your NOC operators can actually use.

```
                     ┌─────────────────────────────────────┐
                     │  YAML Topology  (config/)           │
                     │  Sites · Rooms · Racks · Devices    │
                     └───────────────┬─────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Backend  :8000    │   FastAPI · Python 3.12
                          │  Query planner      │   Batched PromQL queries
                          │  Health engine      │   Plugin system
                          └──────────┬──────────┘
                                     │  PromQL
                          ┌──────────▼──────────┐
                          │   Prometheus :9090  │
                          └──────────┬──────────┘
                                     │  scrapes
                          ┌──────────▼──────────┐
                          │  Your infrastructure │  or the built-in Simulator
                          └─────────────────────┘
                                     ▲
                          ┌──────────┴──────────┐
                          │   Frontend  :5173   │   React 19 · Tailwind v4
                          │  Physical views     │   Dark mode · NOC-ready
                          └─────────────────────┘
```

---

## ✨ Key Features

### 🗺️ Physical Views
- **World Map** — sites across the globe with live health markers
- **Room View** — floor plan with rack grid, zoom controls, 6 tooltip styles
- **Rack View** — front/rear elevation with template-driven device placement
- **Device View** — instance-level drill-down with live metrics and check results
- **Cluster Overview** — wallboard for small clusters, drag-and-drop rack ordering

### 📊 Dashboard
- Drag-and-drop widget grid with 20+ widgets
- Deep-linkable dashboard URLs (`/dashboard/:id`)
- Per-user layout, widget title alignment, dark/light mode

### 🏥 Health Checks
- PromQL-based checks with severity rules (OK / Warning / Critical)
- `for:` debounce — alert only if condition persists N minutes
- `expand_by_label` — per-sub-component checks (per disk slot, per port…)
- Health propagates: node → chassis → rack → room → site

### 🖥️ HPC / Slurm
- Node state monitoring with configurable status mapping
- Wallboard, partitions, alerts, and nodes list views
- Node mapping with wildcard patterns

### 🔔 NOC Features
- **Sound alerts** — 6 configurable presets including fire truck siren, mute toggle
- **Playlist mode** — automatic view rotation for NOC screens
- **Notification panel** — adaptive height, mute toggle, real-time badge

### ⚙️ Configuration & Editors
- All config in YAML — GitOps-friendly, no database required
- Visual editors: topology, rack, templates, checks, metrics, settings

---

## 🚀 Quick Start

**Requirements**: Docker & Docker Compose. Nothing else.

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make up
```

| Service | URL | Description |
|---|---|---|
| 🖥️ **Web UI** | http://localhost:5173 | Main interface |
| 📖 **API Docs** | http://localhost:8000/docs | Swagger / OpenAPI |
| 📊 **Prometheus** | http://localhost:9090 | Metrics backend |
| 🔬 **Simulator** | http://localhost:9000 | Demo metrics |
| 📚 **Docs** | http://localhost:3001 | Documentation site |

The stack starts with a demo topology and simulated metrics — explore immediately, no hardware required.

---

## 📁 Project Structure

```
rackscope/
├── config/                  # All configuration (YAML, GitOps-friendly)
│   ├── app.yaml             # Central config: Prometheus URL, features, plugins
│   ├── topology/            # Infrastructure: sites, rooms, racks, devices
│   ├── templates/           # Hardware templates (devices, racks, components)
│   ├── checks/library/      # Health check definitions (PromQL + rules)
│   ├── metrics/library/     # Metric definitions (display config, thresholds)
│   └── plugins/             # Per-plugin config (slurm, simulator)
├── src/rackscope/           # Backend (FastAPI / Python 3.12)
├── frontend/src/            # Frontend (React 19 / TypeScript / Tailwind v4)
├── tools/simulator/         # Demo metrics generator
├── website/                 # Documentation site (Docusaurus 3)
└── tests/                   # Backend test suite (683 tests, 90% coverage)
```

---

## 🔌 Plugin System

Rackscope ships with two built-in plugins and a documented API to build your own:

| Plugin | Description | Status |
|---|---|---|
| **Simulator** | Realistic metric generation for demos and testing | Built-in |
| **Slurm** | HPC workload manager integration | Built-in |
| *Custom* | Build your own plugin with routes + menu sections | [See docs](https://rackscope.dev/plugins/writing-plugins) |

---

## 🛠️ Development

All commands run **inside Docker containers** — no local Python or Node.js needed.

```bash
# Stack
make up           # Start (backend · frontend · simulator · prometheus)
make down         # Stop
make restart      # Restart (picks up config changes)
make logs         # Follow all logs

# Quality
make lint         # ruff + eslint + stylelint + prettier
make test         # pytest (683 tests)
make test-v       # Verbose — shows each test name
make test-k K=x   # Filter by keyword  (e.g. K=planner, K=auth)
make typecheck    # mypy — 0 errors
make coverage     # Coverage report → htmlcov/
make security     # bandit + npm audit + pip-audit
make ci           # Full pipeline: quality + security

# Docs
make docs         # Docusaurus → http://localhost:3001
```

---

## 📚 Documentation

Full documentation at **https://rackscope.dev** (or `make docs` locally):

- [Getting Started](https://rackscope.dev/getting-started/quick-start)
- [Configuration Reference](https://rackscope.dev/admin-guide/app-yaml)
- [Topology YAML](https://rackscope.dev/admin-guide/topology-yaml)
- [Health Checks](https://rackscope.dev/user-guide/health-checks)
- [Plugin Development](https://rackscope.dev/plugins/writing-plugins)
- [Design System](https://rackscope.dev/design-system/overview)

---

## 🤝 Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

Bug reports and feature requests → [GitHub Issues](https://github.com/SckyzO/rackscope/issues)

---

## 📄 License

[AGPL-3.0-or-later](LICENSE) — Thomas Bourcey ([@SckyzO](https://github.com/SckyzO))

For commercial use or proprietary deployments, contact **sckyzo@gmail.com**.

---

<div align="center">

Made with ❤️ for datacenter operators and HPC teams

</div>
