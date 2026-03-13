<div align="center">

# 🔭 Rackscope

**Physical infrastructure visibility for data centers and HPC clusters**

[![CI](https://github.com/SckyzO/rackscope_dev/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SckyzO/rackscope_dev/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue?style=flat-square)](CHANGELOG.md)
[![Tests](https://img.shields.io/badge/tests-855%2B%20passing-brightgreen?style=flat-square)](STATUS.md)
[![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black)](frontend/package.json)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange?style=flat-square)](LICENSE)

[🌐 rackscope.dev](https://rackscope.dev) · [📚 Documentation](https://rackscope.dev) · [🐛 Issues](https://github.com/SckyzO/rackscope/issues)

</div>

---

Rackscope maps alerts and metrics to their physical location — from world map down to the rack slot.
Connects to your existing monitoring stack, no database required.

## ✨ Features

- **Physical views** — world map, room floor plans, front/rear rack, device drill-down
- **Health checks** — PromQL-based, propagates node → rack → room → site
- **HPC / Slurm** — node states, partitions, wallboard
- **NOC-ready** — dark mode, playlist mode, sound alerts
- **Visual editors** — topology, rack, templates, checks, settings
- **Plugin system** — Slurm and Simulator built-in, extensible

---

## 📸 Overview

![Rackscope Dashboard](website/static/img/screenshots/rackscope-dashboard-overview.png)

---

## 🚀 Quick Start

**Requirements**: Docker & Docker Compose only.

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make up
```

| Service | URL |
|---------|-----|
| 🖥️ Web UI | http://localhost:5173 |
| 📖 API Docs | http://localhost:8000/docs |
| 📊 Prometheus | http://localhost:9090 |
| 📚 Docs | http://localhost:3001 |

Bundled examples (no hardware required):

```bash
make use CONFIG=homelab        #     23 nodes
make use CONFIG=small-cluster  #    608 nodes
make use CONFIG=hpc-cluster    #  1 912 nodes
make use CONFIG=exascale       # 14 218 nodes · 3 sites
```

---

## 🛠️ Development

All commands run inside Docker — no local Python or Node.js needed.

```bash
make up       # Start stack
make lint     # ruff · eslint · prettier
make test     # 855+ tests
make quality  # lint + typecheck + coverage
make docs     # Docusaurus → http://localhost:3001
```

---

## 📚 Documentation

Full documentation at **[rackscope.dev](https://rackscope.dev)**

- [Quick Start](https://rackscope.dev/docs/getting-started/quick-start)
- [Configuration Reference](https://rackscope.dev/docs/admin-guide/app-yaml)
- [Health Checks](https://rackscope.dev/docs/user-guide/health-checks)
- [Plugin Development](https://rackscope.dev/docs/plugins/writing-plugins)

---

## 🤝 Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

Bug reports and feature requests → [GitHub Issues](https://github.com/SckyzO/rackscope/issues)

---

## ☕ Support

Rackscope is free and open-source. If it saves you time, consider supporting its development:

<div align="center">

[![Ko-fi](https://img.shields.io/badge/Ko--fi-support%20the%20project-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/sckyzo)
[![PayPal](https://img.shields.io/badge/PayPal-donate-003087?style=flat-square&logo=paypal&logoColor=white)](https://www.paypal.me/sckyzo)

</div>

---

## 📄 License

[AGPL-3.0-or-later](LICENSE) — Thomas Bourcey ([@SckyzO](https://github.com/SckyzO))

For commercial use or proprietary deployments, contact **sckyzo@gmail.com**.

---

<div align="center">

Made with ❤️ for datacenter operators and HPC teams

</div>
