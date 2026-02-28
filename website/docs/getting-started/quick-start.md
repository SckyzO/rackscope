---
id: quick-start
title: Quick Start
sidebar_position: 1
---

# Quick Start

Get Rackscope running in 3 steps using Docker Compose.

## Prerequisites

- **Docker** and **Docker Compose** installed on your host machine
- No local Python or Node.js required — everything runs in containers

## Step 1: Clone the Repository

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
```

## Step 2: Start the Stack

```bash
make up
```

This starts 4 services:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React web UI |
| **Backend** | http://localhost:8000 | FastAPI REST API |
| **Prometheus** | http://localhost:9090 | Metrics storage |
| **Simulator** | http://localhost:9000 | Demo metrics generator |

## Step 3: Open the UI

Navigate to **http://localhost:5173**

The stack starts with a demo topology and simulated metrics, so you can explore immediately — no hardware required.

## What You'll See

- **World Map**: overview of sites with health status
- **Room Views**: floor plan with racks color-coded by health
- **Rack Views**: front and rear views with devices
- **Device Views**: instance-level drill-down with checks

## Explore the API

Interactive API documentation is available at **http://localhost:8000/docs** (Swagger UI).

## Next Steps

- [Configuration](/getting-started/configuration) — customize topology and settings
- [User Guide](/user-guide/overview) — learn all the views
- [Admin Guide](/admin-guide/topology-yaml) — define your own infrastructure
