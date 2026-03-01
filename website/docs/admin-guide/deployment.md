---
id: deployment
title: Deployment
sidebar_position: 1
---

# Deployment

## Development Stack

```bash
make up   # or: docker compose -f docker-compose.dev.yml up -d
```

Services:
- Backend (FastAPI): `localhost:8000`
- Frontend (Vite dev server with HMR): `localhost:5173`
- Prometheus: `localhost:9090`
- Simulator: `localhost:9000`

## Production Stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

Production differences:
- Frontend served as static build (no HMR)
- Simulator excluded (set `plugins.simulator.enabled: false`)
- Optimized container sizes

## Environment Variables

Set in `docker-compose.*.yml` or as host env variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RACKSCOPE_APP_CONFIG` | `config/app.yaml` | Path to main config |
| `RACKSCOPE_CONFIG_DIR` | `config` | Base config directory |

## Connecting to Real Prometheus

In `config/app.yaml`:

```yaml
telemetry:
  prometheus_url: http://your-prometheus:9090
  # Optional auth:
  # auth:
  #   type: bearer
  #   token: eyJh...
  # Or basic auth:
  # auth:
  #   type: basic
  #   username: admin
  #   password: secret
  # TLS:
  # tls:
  #   verify: false   # skip cert check (not recommended for production)
```

Disable the simulator:
```yaml
plugins:
  simulator:
    enabled: false
```

## Connecting to Real Slurm

Enable the Slurm plugin in `config/app.yaml`:

```yaml
slurm:
  metric: slurm_node_status
  label_node: node
  label_status: status
  label_partition: partition
  status_map:
    idle: OK
    allocated: OK
    down: CRIT
    drain: WARN
```

Rackscope reads Slurm state from Prometheus — you need a Prometheus exporter that provides `slurm_node_status` metrics (e.g., `slurm_exporter`).

## Rebuilding Containers

After changing `pyproject.toml`, `package.json`, or Dockerfiles:

```bash
make build
make up
```

## Logs

```bash
make logs                                    # All services
docker compose -f docker-compose.dev.yml logs -f backend   # Backend only
docker compose -f docker-compose.dev.yml logs --tail=100 frontend
```
