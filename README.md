# Rackscope 🔭

> **Physical Infrastructure Monitoring for racks and data centers.**

Rackscope is a visual monitoring layer for physical infrastructure. It helps you see **where** issues are happening (room → aisle → rack → device) using **Prometheus metrics**, without forcing a CMDB or database.

It’s **HPC‑ready**, but also **generic**: it works for any datacenter, racks, and devices as long as you can expose metrics through Prometheus.
It includes **visual editors** (topology, racks, templates, checks) and a **REST API** for integration and automation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🚀 Key Features

* **Prometheus‑First**: live PromQL queries, no internal time‑series DB.
* **File‑Based Topology**: YAML is the source of truth (GitOps‑friendly).
* **Template‑Driven**: define hardware once, reuse across racks.
* **Physical Views**: overview hub, room layout, front/rear rack views.
* **Visual Editors**: topology, rack, template, and checks editors.
* **API‑First**: REST endpoints for topology, templates, and telemetry.
* **HPC Native**: Twins/Quads/Blades, liquid cooling, dense chassis.
* **Modern UI**: React + Tailwind v4, dark/light, custom accents.

## 📦 Quick Start (Docker)

1. **Clone the repo**:
   ```bash
   git clone https://github.com/SckyzO/rackscope.git
   cd rackscope
   ```

2. **Start the stack**:
   ```bash
   docker compose up -d --build
   ```

3. **Open the interfaces**:
   - **Web UI**: [http://localhost:5173](http://localhost:5173)
   - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Prometheus**: [http://localhost:9090](http://localhost:9090)
   - **Simulator**: [http://localhost:9000](http://localhost:9000)

## 🛠️ Configuration (Quick Overview)

- **Topology**: `config/topology/` (start at `config/topology/sites.yaml`)
- **Templates**: `config/templates/`
- **Checks library**: `config/checks/library/`
- **App config**: `config/app.yaml`

Example device definition:
```yaml
- id: r01-01-c01
  name: Compute 01
  template_id: bs-x440-a5
  u_position: 1
  instance: compute[001-004]
```

## 🔄 How it Works (Simple Flow)

You describe your infrastructure in **YAML** (sites, rooms, racks, templates).  
The **backend** loads those files and queries **Prometheus**.  
The **API** exposes layout + health, and the **frontend** renders the views.

In short: **YAML → Backend → API → Frontend**, with Prometheus providing live metrics.

## 🧪 Metrics Simulator (for testing)

A built‑in simulator generates realistic Prometheus metrics so you can test without a real DC:
- simulate up/down nodes
- inject warnings/critical states
- emulate storage/IPMI/infra metrics

Prometheus scrapes the simulator, and the UI behaves like production.

## ✅ Lint & Quality (Docker)

Run all checks inside containers:
```bash
make lint
```

This runs:
- **Backend**: `ruff check` + `ruff format --check`
- **Frontend**: `eslint`, `stylelint` (CSS), and `prettier --check`

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)
- [Roadmap](ARCHITECTURE/ROADMAP.md)

## 🤝 Contributing

Contributions are welcome.  
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before opening a PR.
