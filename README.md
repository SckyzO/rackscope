<div align="center">

# 🔭 Rackscope

**When an alert fires — know exactly where it is.**
From world map to rack slot, in real time.

[![CI](https://github.com/SckyzO/rackscope/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/SckyzO/rackscope/actions/workflows/ci.yml)
[![Security](https://github.com/SckyzO/rackscope/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/SckyzO/rackscope/actions/workflows/security.yml)
[![Version](https://img.shields.io/badge/version-1.0.0--beta1-blue?style=flat-square)](CHANGELOG.md)
[![Tests](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/SckyzO/rackscope/main/badges/tests.json&style=flat-square)](STATUS.md)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/SckyzO/rackscope/main/badges/coverage.json&style=flat-square)](STATUS.md)
[![Python](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](pyproject.toml)
[![React](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black)](frontend/package.json)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange?style=flat-square)](LICENSE)

<p align="center">
  <a href="https://rackscope.dev">🌐 <b>Website</b></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://rackscope.dev/getting-started/quick-start">📚 <b>Documentation</b></a>
  &nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://github.com/SckyzO/rackscope/issues">🐛 <b>Issues</b></a>
</p>

</div>

---

```
World Map → Room → Rack → Device → Instance
                 ↑ Prometheus alerts · real-time
```

## How it works

```
① Templates      ② Checks         ③ Topology        → Views
  Rack models      PromQL rules      YAML or UI         World map · Room plan
  Device models    Per type or       Sites, rooms        Rack elevation · Device
                   per rack          racks, slots        NOC wallboard
```

No code, no database — define once in YAML, reuse everywhere.

---

## ✨ Features

**🗺️ Physical views** — World map · Room floor plan (10 styles) · Front/rear rack · Device drill-down · NOC wallboard · HPC cluster view

**⚡ Health** — PromQL checks · node→rack→room→site propagation · WARN/CRIT/UNKNOWN · per-component (`expand_by_label`) · toast alerts

**🛠️ Editors** — Topology · Rack (drag & drop) · Templates (Monaco) · Checks library · Settings UI — all without touching YAML

![Rackscope Dashboard](https://rackscope.dev/img/screenshots/rackscope-dashboard-overview.png)

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
make test     # 1039+ tests
make quality  # lint + typecheck + coverage
```

---

## 📚 Documentation

Full documentation at **[rackscope.dev](https://rackscope.dev)**

- [Quick Start](https://rackscope.dev/getting-started/quick-start)
- [Configuration Reference](https://rackscope.dev/admin-guide/app-yaml)
- [Health Checks](https://rackscope.dev/user-guide/health-checks)
- [Plugin Development](https://rackscope.dev/plugins/writing-plugins)

---

## 🤝 Contributing

Contributions are welcome — please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

- **Code, bugs, features** → [open an issue](https://github.com/SckyzO/rackscope/issues)
- **Documentation** → contribute to the [rackscope_documentation](https://github.com/SckyzO/rackscope_documentation) repo

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
