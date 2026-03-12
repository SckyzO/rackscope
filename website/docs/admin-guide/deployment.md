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
export RACKSCOPE_VERSION=latest  # or a specific version tag e.g. 1.0.0
docker compose -f docker-compose.prod.yml up -d
```

The production stack uses pre-built images from GHCR. Key differences from dev:

| Aspect | Dev | Prod |
|---|---|---|
| Frontend | Vite dev server (HMR, hot reload) | `npm run build` → nginx static files |
| Backend | `uvicorn --reload` | `uvicorn` (no reload) |
| Images | Built locally | Pulled from `ghcr.io/sckyzO/rackscope-*` |
| Simulator | Included (disable in `app.yaml`) | Optional |

### Frontend production build

The frontend uses a **multi-stage Docker build** (`frontend/Dockerfile.prod`):

1. **Stage `builder`** — Node.js 22, runs `npm run build` (TypeScript → Vite → `dist/`)
2. **Stage `production`** — nginx 1.27 Alpine, serves `dist/` as static files

The nginx config (`frontend/nginx.prod.conf`) handles:
- SPA routing (all unknown routes → `index.html`)
- `/api/` proxied to the backend container
- Long-term caching for Vite-hashed static assets

### Config directory

The backend mounts `./config` as a **read-write** volume (`./config:/app/config`). This is intentional — the Settings UI writes to `app.yaml`, `plugin.yaml`, and `config.yml` at runtime.

:::caution
Do not use `:ro` (read-only) for the config mount in production. The Settings UI will fail silently when trying to save changes.
:::

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

## Network security — firewall port 8000

:::warning
**Always firewall port 8000 (backend) in production.**

When `auth.enabled: false` (the default), the backend API has no authentication layer. Two system endpoints are particularly sensitive:

- `POST /api/system/restart` — triggers a backend reload
- `GET /api/system/process-stats` — exposes Prometheus URL, simulator hostname, and process memory/CPU

These endpoints are protected by the JWT middleware **only when `auth.enabled: true`**. When auth is disabled, anyone who can reach port 8000 can call them.

**Recommended setup:**
- Expose only the nginx reverse proxy (ports 80/443) to the network
- Keep port 8000 bound to `localhost` or the Docker internal network only
- Use `auth.enabled: true` + a strong `secret_key` for any deployment reachable outside localhost

See [GitHub issue #9](https://github.com/SckyzO/rackscope/issues/9) for the roadmap to harden these endpoints independently of `auth.enabled`.
:::

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

---

## Docker Images (GHCR)

Official images are published to the GitHub Container Registry automatically by CI.

| Image | Tag | Description |
|---|---|---|
| `ghcr.io/sckyzO/rackscope-backend` | `latest` | Latest build from `main` |
| `ghcr.io/sckyzO/rackscope-backend` | `1.0.0` | Tagged release |
| `ghcr.io/sckyzO/rackscope-frontend` | `latest` | Latest build from `main` |
| `ghcr.io/sckyzO/rackscope-frontend` | `1.0.0` | Tagged release |

### Pull a specific version

```bash
docker pull ghcr.io/sckyzO/rackscope-backend:1.0.0
docker pull ghcr.io/sckyzO/rackscope-frontend:1.0.0
```

### Deploy with docker compose

```bash
export RACKSCOPE_VERSION=1.0.0
docker compose -f docker-compose.prod.yml up -d
```

Leave `RACKSCOPE_VERSION` unset (or set to `latest`) to always pull the latest build from `main`.

---

## CI / CD

Three GitHub Actions workflows manage the build and release lifecycle:

### `STATUS.md` — Live quality dashboard

`STATUS.md` at the repository root is automatically generated and committed by the CI after every push to `main`. It gives an at-a-glance view of the current project health:

```markdown
| Check              | Status | Detail                        |
|--------------------|--------|-------------------------------|
| 🧪 Tests           | ✅ 852 | 0 failed · 89% coverage       |
| 🔍 Python lint     | ✅     | ruff check + format           |
| 📦 TypeScript      | ✅     | tsc -b clean                  |
| 🔒 npm security    | ⚠️     | d3-color via react-simple-maps|
```

The file is updated by the `update-status` CI job (runs even when other jobs fail, so it always reflects the true state).

---

### `ci.yml` — Quality checks

Runs on every push and pull request to `main`:

- Backend: pytest (852 tests), ruff lint, mypy, pip-audit
- Frontend: eslint, prettier, stylelint, TypeScript build, npm audit
- On push to `main`: generates and commits `STATUS.md` with current results

### `docker.yml` — Continuous delivery

Runs on push to `main` when source files change:

- Builds `rackscope-backend:latest` from `src/Dockerfile`
- Builds `rackscope-frontend:latest` from `frontend/Dockerfile.prod` (multi-stage: `npm run build` → nginx)
- Pushes both images to GHCR

### `release.yml` — Release on tag

Triggered by pushing a version tag (e.g. `git tag v1.0.0 && git push --tags`):

1. Builds versioned images (`1.0.0`, `1.0`, `latest`) and pushes to GHCR
2. Creates a GitHub Release with:
   - Changelog section for that version (from `CHANGELOG.md`)
   - Docker pull instructions
   - `docker-compose.prod.yml` as a downloadable asset

### `security.yml` — Weekly audit

Runs weekly (Monday 08:00 UTC) and on every push:

- bandit (Python SAST)
- pip-audit (Python CVEs)
- npm audit (frontend CVEs)

### `dependabot.yml` — Automatic dependency updates

Opens PRs automatically when new versions are available for:

- Python packages (`pyproject.toml`) — weekly, minor/patch only
- npm packages (`frontend/package.json`) — weekly, minor/patch only
- GitHub Actions — weekly

Major version bumps are excluded and must be updated manually.

---

## Creating a release

```bash
# 1. Update CHANGELOG.md with the new version section
# 2. Commit everything
git add -A && git commit -m "chore: prepare v1.1.0"

# 3. Tag and push — this triggers the release workflow
git tag v1.1.0
git push origin main --tags
```

GitHub Actions will:
1. Build and push `rackscope-backend:1.1.0` and `rackscope-frontend:1.1.0` to GHCR
2. Create a GitHub Release with the changelog and `docker-compose.prod.yml`
