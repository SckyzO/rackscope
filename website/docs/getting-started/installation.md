---
id: installation
title: Installation
sidebar_position: 2
---

# Installation

## Requirements

- Docker 24+
- Docker Compose v2+

No local Python, Node.js, or database required.

## Docker Compose (Recommended)

### Development Stack

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make up
```

Services: backend (:8000), frontend (:5173), simulator (:9000), prometheus (:9090).

### Production Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production stack excludes the simulator and uses a production-optimized frontend build.

## Makefile Commands

```bash
make up           # Start development stack
make down         # Stop stack
make restart      # Restart all services (reload config)
make build        # Rebuild containers
make logs         # Follow all service logs
make lint         # Run all linters
make test         # Run backend tests
make typecheck    # Run mypy type checker
make quality      # Run all quality checks
make docs         # Start documentation site (port 3001)
```

## Configuration Files

After cloning, the `config/` directory contains everything you need:

```
config/
├── app.yaml                    # Main application config
├── topology/                   # Infrastructure definition
│   ├── sites.yaml
│   └── datacenters/
│       └── {site_id}/
│           └── rooms/
├── templates/                  # Hardware templates
│   ├── devices/
│   ├── racks/
│   └── rack_components/
├── checks/library/             # Health check definitions
├── metrics/library/            # Metric definitions
└── plugins/
    ├── simulator/              # Simulator config and scenarios
    └── slurm/                  # Slurm node mapping
```

## Verify Installation

```bash
# Check all services are healthy
make logs

# Run tests
make test
# Expected: 362 passed

# Check API
curl http://localhost:8000/api/stats/global
```

## Updating

```bash
git pull
make build
make up
```
