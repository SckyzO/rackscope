---
id: installation
title: Installation
sidebar_position: 2
---

# Installation

## Requirements

- Docker 24+
- Docker Compose v2+

No local Python, Node.js, or database required — everything runs in containers.

## Clone and start

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make up
```

## Makefile reference

### Stack management

```bash
make up           # Start development stack (detached)
make down         # Stop and remove containers
make restart      # Restart all services (picks up config changes)
make build        # Rebuild Docker images
make logs         # Follow all service logs
```

### Code quality

```bash
make lint         # ESLint + Stylelint + Prettier (frontend) + ruff (backend)
make typecheck    # mypy on src/rackscope — target: 0 errors
make test         # pytest — 362 tests
make coverage     # pytest + coverage report (htmlcov/)
make complexity   # radon cyclomatic complexity
make quality      # lint + typecheck + complexity + coverage
```

### Security

```bash
make security           # Full audit: bandit + npm audit + pip-audit
make security-backend   # Python SAST (bandit, Medium/High only)
make security-frontend  # npm dependency audit
make security-deps      # Python dependency audit (pip-audit)
```

See [Security Audit](/development/security) for details.

### Documentation

```bash
make docs         # Start Docusaurus at http://localhost:3001
make docs-build   # Build static site
make docs-logs    # Follow docs service logs
```

## Config directory

After cloning, `config/` contains everything:

```
config/
├── app.yaml                        # Main application config
├── topology/                       # Infrastructure definition
│   ├── sites.yaml
│   └── datacenters/{site_id}/
│       └── rooms/{room_id}/
├── templates/                      # Hardware templates
│   ├── devices/
│   ├── racks/
│   └── rack_components/
├── checks/library/                 # Health check definitions
├── metrics/library/                # Metric definitions
└── plugins/
    ├── simulator/                  # Simulator scenarios and overrides
    └── slurm/                      # Slurm node mapping
```

## Verify

```bash
# API health check
curl http://localhost:8000/healthz

# Run tests
make test
# Expected: 362 passed

# Interactive API docs
open http://localhost:8000/docs
```

## Production stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production stack excludes the simulator and Prometheus (assumes you have your own), uses a production-optimised frontend build, and runs the backend without `--reload`.

## Updating

```bash
git pull
make build
make up
```
