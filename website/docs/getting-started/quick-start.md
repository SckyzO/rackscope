---
id: quick-start
title: Quick Start
sidebar_position: 1
---

# Quick Start

Get Rackscope running in minutes. Choose your mode:

| Mode | Use for | Command |
|---|---|---|
| **Dev** | Testing, demos, development | `make up` |
| **Prod** | Production deployment | `make up-prod` |

---

## Dev mode

### Prerequisites

- Docker 24+ and Docker Compose v2+
- No local Python or Node.js required

### 1. Clone

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
```

### 2. Generate the TLS certificate (first time only)

```bash
make cert
```

### 3. Start the dev stack

```bash
make up
```

Six services start automatically:

| Service | URL | Description |
|---|---|---|
| **UI** | https://localhost | React frontend (via nginx) |
| **API** | https://localhost/api | FastAPI REST + Swagger |
| **Prometheus** | http://localhost:9090 | Metrics storage |
| **Simulator** | http://localhost:9000 | Demo metrics generator |
| **Frontend dev** | http://localhost:5173 | Vite dev server (hot-reload) |
| **Docs** | http://localhost:3001 | This site (`make docs`) |

:::tip Browser warning
The TLS certificate is self-signed. Add a browser exception once for `https://localhost`.
:::

### 4. Open the UI

Navigate to **https://localhost**

The stack starts with the `hpc-cluster` example — a realistic HPC datacenter with simulated metrics. No hardware required.

---

## Prod mode

Prod uses pre-built images from GHCR — no source code required.

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
RACKSCOPE_VERSION=latest make up-prod
```

| Service | URL | Description |
|---|---|---|
| **UI** | http://localhost | React frontend (nginx-served) |
| **API** | http://localhost:8000 | FastAPI REST |

The prod stack does **not** include the simulator or Prometheus — connect to your existing Prometheus via `app.yaml`.

See [Installation](/getting-started/installation) for full prod setup details.

---

## Try the bundled examples

Switch between four ready-to-use configurations with a single command:

```bash
make use-homelab         # ~23 nodes, 1 site, no Slurm
make use-small-cluster   # ~600 nodes, GPU + compute, Slurm
make use-hpc-cluster     # ~1900 nodes, DCW cooling, Slurm
make use-exascale        # ~14000 nodes, 3 sites, Slurm
```

Or with an explicit argument:

```bash
make use EXAMPLE=hpc-cluster
```

Check the active config at any time:

```bash
make which-config
```

Each example works immediately with the built-in simulator. See [Example Configurations](/getting-started/examples) for details.

---

## Next steps

- [Installation](/getting-started/installation) — full setup, prod deployment, Makefile reference
- [Example Configurations](/getting-started/examples) — bundled topologies
- [Configuration](/getting-started/configuration) — connect your Prometheus and define your topology
- [User Guide](/user-guide/overview) — all views and features
