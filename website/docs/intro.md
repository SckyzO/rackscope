---
id: intro
title: Introduction
sidebar_position: 1
---

# Rackscope

**Prometheus-first physical infrastructure monitoring** for data centers and HPC environments.

## What is Rackscope?

Rackscope is a **physical visualization layer** for teams operating data centers and HPC clusters.

When an alert fires, monitoring tools typically indicate what is wrong — but rarely where the problem is located in the physical infrastructure. Rackscope provides that physical context, anchoring every metric and alert to the actual topology of the infrastructure.

### Infrastructure navigation by level

Rackscope follows an inverted-pyramid approach. Starting from a global overview of all sites, the operator can progressively drill down into finer levels of detail:

```
Global → Datacenter → Room → Aisle → Rack → Device → Instance
```

At each level, only the relevant information is displayed. This allows moving quickly from a global alert to the precise identification of its physical location — without navigating through disconnected tools.

### Native integration with Prometheus

Rackscope relies entirely on Prometheus for metrics collection. Any metric exposed in Prometheus can become a visible health check in the interface, regardless of its origin: hardware sensors, software services, network equipment, storage arrays, or HPC workloads.

### A complementary tool, not a replacement

Rackscope does not replace existing tools such as Grafana, Nagios, or Zabbix. It positions itself as an intermediate layer between metrics dashboards and supervision platforms — adding the physical location of the problem to the monitoring chain.

### Simple, declarative configuration

All infrastructure configuration is stored in YAML files — GitOps-compatible, version-controlled, and diff-friendly. The tool is CMDB-agnostic and can be fed by scripts, external CMDBs (NetBox, RacksDB), or the REST API directly.

A native plugin system allows extending the tool. Slurm integration is available out of the box; the architecture is open to further additions.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Prometheus-First** | Live PromQL queries — no internal time-series database |
| **File-Based Topology** | YAML source of truth, GitOps-friendly, no database |
| **Template-Driven** | Define hardware once, reuse across racks |
| **Physical Views** | World map, room layout, front/rear rack views |
| **Visual Editors** | Topology, rack, template, checks, settings |
| **HPC Native** | Slurm integration, high-density chassis, liquid cooling |
| **Plugin Architecture** | Optional Slurm and Simulator plugins |
| **NOC-Ready** | Dark mode, playlist mode, sound alerts |

---

## Quick Links

- [Quick Start](/getting-started/quick-start) — up and running in minutes
- [Example Configurations](/getting-started/examples) — simple lab or 855-node HPC cluster
- [Configuration Reference](/admin-guide/app-yaml) — complete app.yaml reference
- [Health Checks](/user-guide/health-checks) — PromQL-based check system
- [Plugin Guide](/plugins/writing-plugins) — extend Rackscope

---

## Architecture Overview

```
YAML Config → Backend (FastAPI) → Prometheus ← Simulator (demo)
                     ↓
              REST API (:8000)
                     ↓
            Frontend (:5173) → Physical Views
```

**Physical Hierarchy**: `Site → Room → Aisle → Rack → Device → Instance`

---

## Status

- ✅ 852 tests passing · 89% coverage
- ✅ 0 mypy errors · 0 ESLint warnings
- ✅ AGPL-3.0 · [rackscope.dev](https://rackscope.dev)
