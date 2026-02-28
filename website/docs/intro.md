---
id: intro
title: Introduction
sidebar_position: 1
---

# Rackscope

**Prometheus-first physical infrastructure monitoring** for data centers and HPC environments.

Rackscope provides visual monitoring of the full physical hierarchy — **Site → Room → Aisle → Rack → Device → Instance** — using live Prometheus metrics, with zero database requirements and full GitOps compatibility.

## What is Rackscope?

Rackscope is a **visualization layer**, not a data collector. It:

- Reads your infrastructure description from **YAML files**
- Queries **Prometheus** for live metrics using batched PromQL
- Renders **physical views** (room layout, rack front/rear, device drill-down)
- Provides **visual editors** for all configuration
- Supports **HPC clusters** with Slurm integration

It is **NOT** a CMDB replacement, a metric collector, or a Grafana plugin.

## Key Features

| Feature | Description |
|---------|-------------|
| **Prometheus-First** | Live PromQL queries, no internal time-series DB |
| **File-Based Topology** | YAML source of truth, GitOps-friendly |
| **Template-Driven** | Define hardware once, reuse across racks |
| **Physical Views** | World map, room layout, front/rear rack views |
| **Visual Editors** | Topology, rack, template, checks, settings |
| **HPC Native** | Twins/Quads/Blades, liquid cooling, Slurm integration |
| **Plugin Architecture** | Optional Slurm and Simulator plugins |
| **Metrics Library** | 39+ pre-defined metrics with display config |
| **NOC-Ready** | Dark mode first-class, physical drill-down |

## Quick Links

- [Quick Start](/getting-started/quick-start) — up and running in 3 steps
- [Configuration](/getting-started/configuration) — app.yaml, topology, templates
- [API Reference](/api-reference/overview) — all REST endpoints
- [Plugin Guide](/plugins/writing-plugins) — extend Rackscope

## Architecture Overview

```
YAML Config → Backend (FastAPI) → Prometheus ← Simulator (demo)
                     ↓
              REST API (:8000)
                     ↓
            Frontend (:5173) → Physical Views
```

**Physical Hierarchy**: `Site → Room → Aisle → Rack → Device → Instance`

## Status

- ✅ 362 tests passing
- ✅ 0 mypy type errors
- ✅ All linters passing (ruff, eslint, stylelint, prettier)
- ✅ 39 metric definitions in library
- MIT License
