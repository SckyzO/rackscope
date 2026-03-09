<div align="center">

# 🔭 Rackscope

**Prometheus-first physical infrastructure monitoring for data centers and HPC environments**

[![CI](https://github.com/SckyzO/rackscope/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SckyzO/rackscope/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue?style=flat-square)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-852%2B%20passing-brightgreen?style=flat-square)](STATUS.md)
[![Coverage](https://img.shields.io/badge/coverage-89%25-brightgreen?style=flat-square)](STATUS.md)
[![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black)](frontend/package.json)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange?style=flat-square)](LICENSE)

[🌐 rackscope.dev](https://rackscope.dev) · [📚 Documentation](https://rackscope.dev) · [🐛 Issues](https://github.com/SckyzO/rackscope/issues) · [🚀 Quick Start](#-quick-start)

</div>

---

## What is Rackscope?

**You know something is broken. You don't know where.**

Your Prometheus tells you a node is down. Your Grafana shows the metric. But neither tells you which rack, which aisle, which room — and that's what actually matters when someone needs to go fix it.

Rackscope is the **physical visualization layer** between your metrics and your infrastructure. It takes your existing Prometheus data and anchors it to a real physical location, letting you drill down from a global alert to the exact device in a few clicks.

```
Global view        All sites — health summary, world map, active alerts
  └── Datacenter   Site-level overview — rooms, rack count, health status
        └── Room   Floor plan — aisle layout, rack grid, 10 display styles
              └── Aisle   Row of racks — aggregate severity per aisle
                    └── Rack    Front/rear elevation — device placement
                          └── Device     Chassis or unit — instances, checks
                                └── Instance   Single node — live health state
```

Navigate from the top to the bottom. Every alert is anchored to a physical location.

### Not a replacement — the missing layer

```
Grafana             Rackscope               Supervision (Nagios/Zabbix)
────────────        ─────────────────       ────────────────────────────
Metrics &     →     Physical context  →     Full alerting, ITSM,
dashboards          of your alerts          what to do next

"cpu is 95%"   →    "Rack C04, Aisle 2,  →  "Ticket #4821 opened"
                     Machine Room A"
```

Rackscope doesn't replace your monitoring stack. It adds the one thing it was missing: **where**.

### Any metric. Any team.

Because Rackscope runs every health check as a live PromQL query, anything that reaches Prometheus becomes a visible check — no configuration beyond a YAML rule.

| Hardware teams | Software teams |
|---|---|
| Server / rack down (`ipmi_up`, `node_up`) | Service availability (`up{job="myapp"}`) |
| Temperature & cooling (`ipmi_temperature`) | Critical app alerts (any custom metric) |
| PDU load & power (`pdu_total_load_watts`) | Slurm node states (`slurm_node_status`) |
| InfiniBand / network (`ib_port_state`) | Job queue depth, partition health |
| Storage health (`eseries_drive_status`) | Any Prometheus exporter |

### Zero database. CMDB-agnostic.

All configuration lives in YAML files. Commit them to Git, diff them in pull requests, generate them from any script.

```bash
# Generate from NetBox, RacksDB, or any script
python generate_topology.py --from-netbox > config/topology/sites.yaml

# Or use the API directly
curl -X POST /api/topology/sites -d '{"id":"dc-paris","name":"Paris DC"}'
```

No CMDB required. No vendor lock-in. If your tools can write a file, Rackscope can read it.

---

## 📸 Overview

![Rackscope Dashboard](website/static/img/screenshots/rackscope-dashboard-overview.png)

*Analytics dashboard — live health states, active alerts, world map, Prometheus stats*

---

## ✨ Key Features

### 🗺️ Physical Views
- **World Map** — sites across the globe with live health markers
- **Datacenter View** — site overview with room cards and mini rack grids
- **Room View** — floor plan with rack grid, zoom controls, 10 display styles
- **Rack View** — front/rear elevation with template-driven device placement
- **Device View** — instance-level drill-down with live metrics and check results
- **Cluster Overview** — wallboard for small clusters, drag-and-drop rack ordering

### 📊 Dashboard
- Drag-and-drop widget grid with 20+ widgets
- Deep-linkable dashboard URLs (`/dashboard/:id`)
- Per-user layout, dark/light mode, NOC-ready

### 🏥 Health Checks
- PromQL-based checks with severity rules (OK / Warning / Critical)
- `for:` debounce — alert only if condition persists N minutes
- `expand_by_label` — per-sub-component checks (per disk slot, per port…)
- Health propagates: node → chassis → rack → room → site

### 🖥️ HPC / Slurm
- Node state monitoring with configurable status mapping
- Wallboard, partitions, alerts, and nodes list views
- Node mapping with wildcard patterns
- Native Slurm metrics plugin

### 🔔 NOC Features
- **Sound alerts** — 6 configurable presets including fire truck siren, mute toggle
- **Playlist mode** — automatic view rotation for NOC screens
- **Notification panel** — adaptive height, mute toggle, real-time badge

### ⚙️ Configuration & Editors
- All config in YAML — GitOps-friendly, no database required
- Visual editors: topology, rack, templates, checks, metrics, settings
- Bundled examples: `simple-room` (10 nodes) and `full-datacenter` (855 nodes HPC cluster)

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

The stack starts with the `full-datacenter` example (855 simulated nodes) — explore immediately, no hardware required.

Try the bundled examples:

```bash
./scripts/use-example.sh simple-room       # 1 room, 4 racks, ~10 nodes
./scripts/use-example.sh full-datacenter   # 2 sites, 855-node HPC cluster
```

---

## 📁 Project Structure

```
rackscope/
├── config/                  # All configuration (YAML, GitOps-friendly)
│   ├── app.yaml             # Central config: Prometheus URL, features, plugins
│   ├── app.yaml.reference   # Fully annotated reference — copy to start fresh
│   ├── topology/            # Infrastructure: sites, rooms, racks, devices
│   ├── templates/           # Hardware templates (devices, racks, components)
│   ├── checks/library/      # Health check definitions (PromQL + rules)
│   ├── metrics/library/     # Metric definitions (display config, thresholds)
│   └── plugins/             # Per-plugin config (slurm, simulator)
├── examples/                # Ready-to-use example configurations
│   ├── simple-room/         # Minimal lab — 4 racks, ~10 nodes
│   └── full-datacenter/     # HPC cluster — 855 nodes, 2 sites, 22 racks
├── src/rackscope/           # Backend (FastAPI / Python 3.12)
├── frontend/src/            # Frontend (React 19 / TypeScript / Tailwind v4)
├── plugins/                 # Plugin system (simulator, slurm)
├── website/                 # Documentation site (Docusaurus 3)
├── scripts/                 # Utilities (use-example.sh, gen_status.py)
└── tests/                   # Backend test suite (852+ tests, 89% coverage)
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
make test         # pytest (852+ tests)
make typecheck    # mypy — 0 errors
make coverage     # Coverage report → htmlcov/
make complexity   # radon cyclomatic complexity
make quality      # lint + typecheck + complexity + coverage

# Security
make security     # bandit + npm audit + pip-audit
make ci           # Full pipeline: quality + security

# Docs
make docs         # Docusaurus → http://localhost:3001
```

---

## 📚 Documentation

Full documentation at **[rackscope.dev](https://rackscope.dev)** (or `make docs` locally):

- [Getting Started](https://rackscope.dev/getting-started/quick-start)
- [Example Configurations](https://rackscope.dev/getting-started/examples)
- [Configuration Reference](https://rackscope.dev/admin-guide/app-yaml)
- [Topology YAML](https://rackscope.dev/admin-guide/topology-yaml)
- [Health Checks](https://rackscope.dev/user-guide/health-checks)
- [Plugin Development](https://rackscope.dev/plugins/writing-plugins)

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
