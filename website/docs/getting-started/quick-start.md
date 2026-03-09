---
id: quick-start
title: Quick Start
sidebar_position: 1
---

# Quick Start

Get Rackscope running in 3 steps using Docker Compose.

## Prerequisites

- **Docker** and **Docker Compose v2+** on your host machine
- No local Python or Node.js required — everything runs in containers

## Step 1: Clone

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
```

## Step 2: Start the stack

```bash
make up
```

Five services start automatically:

| Service | URL | Description |
|---|---|---|
| **Frontend** | http://localhost:5173 | React UI |
| **Backend** | http://localhost:8000 | FastAPI REST API |
| **Prometheus** | http://localhost:9090 | Metrics storage |
| **Simulator** | http://localhost:9000 | Demo metrics generator |
| **Docs** | http://localhost:3001 | This documentation site |

## Step 3: Open the UI

Navigate to **http://localhost:5173**

The stack starts with a demo topology and simulated metrics — no hardware required. The dashboard is live immediately.

## Explore

- **Dashboard** (`/`) — widgets with infrastructure health at a glance
- **World Map** (`/views/worldmap`) — sites with health markers
- **Room View** (`/views/room/:id`) — floor plan with rack grid
- **Rack View** (`/views/rack/:id`) — front/rear elevation with devices
- **Slurm** (`/slurm/overview`) — HPC cluster status (simulator enabled)
- **API docs** — http://localhost:8000/docs (Swagger UI)

## Try the bundled examples

Rackscope ships with ready-to-use example configurations. Switch between them with a single command:

```bash
# Minimal lab — 1 room, 4 racks, ~10 nodes
./scripts/use-example.sh simple-room

# Full HPC datacenter — 2 sites, 855 nodes, GPU + high-memory aisles
./scripts/use-example.sh full-datacenter
```

Each example works immediately with the built-in simulator. Your current config is automatically backed up to `config.bak/`.

See [Example Configurations](/getting-started/examples) for the full list and details.

---

## Next steps

- [Example Configurations](/getting-started/examples) — bundled ready-to-use topologies
- [Configuration](/getting-started/configuration) — connect to your Prometheus and define your topology
- [User Guide](/user-guide/overview) — all views and features
- [Admin Guide](/admin-guide/topology-yaml) — YAML schema reference
