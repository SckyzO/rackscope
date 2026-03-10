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

---

## Dev mode

Dev mode builds images from source and enables hot-reload. Use it for testing, demos, and development.

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope
make cert   # generate self-signed TLS cert (first time only)
make up
```

Access points:

| URL | Service |
|---|---|
| https://localhost | Rackscope UI (nginx reverse proxy) |
| https://localhost/api/docs | Swagger UI |
| http://localhost:9090 | Prometheus |
| http://localhost:5173 | Vite dev server (direct, no TLS) |
| http://localhost:3001 | Docusaurus docs (`make docs`) |

---

## Prod mode

Prod pulls pre-built images from GHCR. No source code modifications or build step required.

```bash
git clone https://github.com/SckyzO/rackscope.git
cd rackscope

# Optional: pin a specific release
export RACKSCOPE_VERSION=1.0.0   # default: latest

make up-prod
```

Access points:

| URL | Service |
|---|---|
| http://localhost | Rackscope UI |
| http://localhost:8000 | FastAPI backend |

The prod stack does **not** include the simulator or a Prometheus instance. Configure your existing Prometheus endpoint in `config/app.yaml`:

```yaml
telemetry:
  prometheus_url: http://your-prometheus:9090
```

:::tip HTTPS in production
Place Rackscope behind a reverse proxy (nginx, Traefik, Caddy) for TLS termination. The prod stack exposes plain HTTP.
:::

---

## Switching configurations

Both dev and prod support named configuration profiles stored in `config/examples/`.

```bash
# Dev — switch + restart backend and simulator
make use EXAMPLE=hpc-cluster
make use-exascale          # shorthand

# Prod — switch + restart backend
make use-prod EXAMPLE=hpc-cluster
make use-prod-exascale     # shorthand

# Check active config
make which-config
```

The active config is persisted in `.env` (gitignored) and read automatically by Docker Compose.

See [Example Configurations](/getting-started/examples) for the full list.

---

## Makefile reference

### Dev stack

```bash
make up           # Start dev stack (detached)
make down         # Stop and remove containers
make restart      # Restart all services
make build        # Rebuild Docker images from source
make logs         # Follow all service logs
make watch-logs   # Follow backend + frontend only
make nginx-logs   # Follow nginx logs
```

### Prod stack

```bash
make up-prod      # Pull images + start prod stack
make down-prod    # Stop prod stack
make restart-prod # Restart prod services
make build-prod   # Pull latest images
make logs-prod    # Follow prod logs
```

### Config profiles

```bash
make use EXAMPLE=<name>       # Switch dev config + restart
make use-prod EXAMPLE=<name>  # Switch prod config + restart
make which-config             # Show active config
```

Available examples: `homelab`, `small-cluster`, `hpc-cluster`, `exascale`

### Code quality (requires dev stack running)

```bash
make lint         # ESLint + Stylelint + Prettier + ruff
make typecheck    # mypy — target: 0 errors
make test         # pytest — 855+ tests
make coverage     # pytest + HTML coverage report (htmlcov/)
make quality      # lint + typecheck + complexity + coverage
make ci           # quality + security
```

### Security

```bash
make security           # Full audit: bandit + npm audit + pip-audit
make security-backend   # Python SAST (bandit)
make security-frontend  # npm dependency audit
make security-deps      # Python dependency audit (pip-audit)
```

### Documentation

```bash
make docs         # Start Docusaurus at http://localhost:3001
make docs-build   # Build static site
make docs-logs    # Follow docs container logs
```

### Utilities

```bash
make cert         # Generate self-signed TLS cert for https://localhost
make shell-backend   # bash shell inside backend container
make shell-frontend  # sh shell inside frontend container
make clean        # Remove containers, volumes, caches
```

---

## Config directory

After cloning, `config/` contains:

```
config/
├── app.yaml                     # Active config (points to an example by default)
├── app.yaml.reference           # Full reference with all options documented
├── app.example.homelab.yaml     ┐
├── app.example.small-cluster.yaml│  Named profiles — used by make use EXAMPLE=...
├── app.example.hpc-cluster.yaml  │
├── app.example.exascale.yaml    ┘
├── examples/                    # Self-contained example topologies
│   ├── homelab/
│   ├── small-cluster/
│   ├── hpc-cluster/
│   └── exascale/
└── plugins/
    ├── simulator/               # Simulator runtime config + metrics catalogs
    └── slurm/                   # Slurm node mapping
```

For production use with real infrastructure, create your own `config/topology/`, `config/templates/`, `config/checks/`, and `config/metrics/` directories, then update `config/app.yaml` to point to them.

---

## Updating

```bash
# Dev
git pull
make build
make up

# Prod
git pull
make up-prod   # pulls latest images automatically
```

---

## Verify

```bash
# API health check
curl http://localhost:8000/healthz

# Run tests (dev only)
make test
# Expected: 855+ passed

# Interactive API docs
open https://localhost/api/docs
```
