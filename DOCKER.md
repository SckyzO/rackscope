# Docker Compose Configuration

Rackscope provides two Docker Compose configurations:

## Development (docker-compose.dev.yml)

**Usage:**
```bash
make up        # Start dev stack
make down      # Stop dev stack
make logs      # Follow logs
make build     # Rebuild containers
```

**Services:**
- **backend**: FastAPI with hot reload
- **frontend**: Vite dev server with HMR
- **simulator**: Metrics simulator for testing
- **prometheus**: Prometheus instance (scrapes simulator)
- **playwright**: E2E testing environment

**Features:**
- Source code mounted as volumes (hot reload)
- Dev tools enabled (Playwright, Prometheus, Simulator)
- Verbose logging
- Development ports exposed

**Use for:**
- Local development
- Testing
- CI/CD pipelines
- Demo environments

---

## Production (docker-compose.prod.yml)

**Usage:**
```bash
make up-prod     # Start production stack
make down-prod   # Stop production stack
make logs-prod   # Follow production logs
make build-prod  # Rebuild production containers
```

**Services:**
- **backend**: FastAPI production mode
- **frontend**: Nginx serving built static files

**Features:**
- Config mounted read-only
- No dev tools
- Production optimizations
- Restart policies enabled

**Use for:**
- Production deployments
- Staging environments
- Performance testing

---

## Configuration

Both compose files use the same environment variables:

```bash
# User/Group IDs for file permissions
export UID=$(id -u)
export GID=$(id -g)

# Application config path
export RACKSCOPE_APP_CONFIG=/app/config/app.yaml
```

---

## Switching Between Environments

The Makefile uses `docker-compose.dev.yml` by default.

To use production:
```bash
make up-prod     # Instead of 'make up'
make logs-prod   # Instead of 'make logs'
```

---

## Notes

- **Dev**: Simulator + Prometheus included for testing without real hardware
- **Prod**: Expects real Prometheus instance (configure in `config/app.yaml`)
- **Frontend Dockerfile**: Dev uses `Dockerfile`, Prod uses `Dockerfile.prod` with multi-stage build
