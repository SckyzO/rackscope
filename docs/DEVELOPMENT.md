# Development Guide

This guide covers development workflows, plugin creation, testing, debugging, and contributing to Rackscope.

## Prerequisites

- **Docker** and **Docker Compose** (required)
- **Git** (required)
- **Python 3.12+** (for local type checking only - development runs in containers)
- **Node.js 18+** (for local linting only - development runs in containers)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/rackscope.git
cd rackscope
```

### 2. Start the Stack

```bash
make up
```

This starts all services:
- **Backend** (FastAPI): `http://localhost:8000`
- **Frontend** (Vite): `http://localhost:5173`
- **Simulator**: `http://localhost:9000`
- **Prometheus**: `http://localhost:9090`

### 3. Verify Services

```bash
make logs
```

Check that all services started successfully.

### 4. Access the UI

Open `http://localhost:5173` in your browser.

## Development Workflow

### Container-Based Development

**IMPORTANT**: All development happens inside Docker containers. Never install dependencies locally.

```bash
# ❌ Don't do this
pip install -e .
npm install

# ✅ Do this instead
make up          # Containers install dependencies automatically
```

### Making Code Changes

#### Backend Changes

1. Edit files in `src/rackscope/`
2. Changes are hot-reloaded automatically (FastAPI auto-reload)
3. Check logs: `make logs`

```bash
# Example: Add a new API endpoint
# Edit: src/rackscope/api/routers/my_router.py
# Save → Backend auto-reloads → Test at http://localhost:8000/docs
```

#### Frontend Changes

1. Edit files in `frontend/src/`
2. Changes are hot-reloaded automatically (Vite HMR)
3. Check browser console for errors

```bash
# Example: Add a new component
# Edit: frontend/src/components/MyComponent.tsx
# Save → Browser auto-reloads
```

#### Configuration Changes

1. Edit files in `config/`
2. Restart services: `make restart`

```bash
# Example: Add a new device template
# Edit: config/templates/devices/server/my-device.yaml
# Run: make restart
```

### Running Commands Inside Containers

#### Backend Shell

```bash
docker compose exec backend bash

# Then run commands:
python -m rackscope
pytest
ruff check src/
```

#### Frontend Shell

```bash
docker compose exec frontend sh

# Then run commands:
npm run build
npm run lint
```

## Code Quality

### Linting

Run all linters (backend + frontend):

```bash
make lint
```

This runs:
- **Backend**: `ruff check .` + `ruff format --check .`
- **Frontend**: `npm run lint` (ESLint) + `npm run lint:css` (Stylelint)

**Fix issues automatically**:

```bash
# Backend
docker compose exec backend ruff format .
docker compose exec backend ruff check --fix .

# Frontend
docker compose exec frontend npm run lint:fix
```

### Type Checking

```bash
make typecheck
```

This runs: `docker compose exec backend mypy src/rackscope`

### Testing

Run all tests:

```bash
make test
```

Run specific tests:

```bash
docker compose exec backend pytest tests/api/test_topology.py
docker compose exec backend pytest tests/plugins/ -v
docker compose exec backend pytest -k "test_plugin_registration"
```

### Code Coverage

```bash
make coverage
```

This generates:
- Terminal report
- HTML report in `htmlcov/index.html`

**Target**: 70%+ coverage

### Code Complexity

```bash
make complexity
```

This runs: `docker compose exec backend radon cc src/rackscope -a -nc`

**Target**: Average complexity < 10 per module

### All Quality Checks

Run everything at once:

```bash
make quality
```

This runs: `lint` + `typecheck` + `complexity` + `coverage`

## Plugin Development

### Creating a New Plugin

See [PLUGINS.md](PLUGINS.md) for detailed guide. Quick example:

```python
# src/rackscope/plugins/monitoring/ipmi/plugin.py
from rackscope.plugins.base import RackscopePlugin
from fastapi import FastAPI

class IpmiPlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "monitoring-ipmi"

    @property
    def plugin_name(self) -> str:
        return "IPMI Monitoring"

    def register_routes(self, app: FastAPI) -> None:
        from .router import router
        app.include_router(router)

    async def on_startup(self) -> None:
        # Initialize resources
        pass
```

### Register Plugin

Edit `src/rackscope/api/app.py`:

```python
from rackscope.plugins.monitoring.ipmi import IpmiPlugin
from rackscope.plugins.registry import registry

@asynccontextmanager
async def lifespan(app: FastAPI):
    registry.register(IpmiPlugin())
    await registry.initialize(app)
    yield
    await registry.shutdown()
```

### Test Plugin

```python
# tests/plugins/test_ipmi_plugin.py
from rackscope.plugins.monitoring.ipmi import IpmiPlugin

def test_plugin_metadata():
    plugin = IpmiPlugin()
    assert plugin.plugin_id == "monitoring-ipmi"
    assert plugin.plugin_name == "IPMI Monitoring"

def test_menu_sections():
    plugin = IpmiPlugin()
    sections = plugin.register_menu_sections()
    assert len(sections) > 0
```

## Metrics Development

### Creating a New Metric

1. **Create YAML file**:

```yaml
# config/metrics/library/my_metric.yaml
id: my_metric
name: My Custom Metric
description: Description
metric: prometheus_metric_name{instance="{instance}"}
labels:
  instance: "{instance}"
display:
  unit: "unit"
  chart_type: line
  color: "#3b82f6"
  aggregation: avg
category: performance
tags:
  - custom
```

2. **Reference in template**:

```yaml
# config/templates/devices/server/my-device.yaml
templates:
  - id: my-device
    metrics:
      - my_metric
```

3. **Restart backend**:

```bash
make restart
```

4. **Test query**:

```bash
curl -X POST http://localhost:8000/api/metrics/data \
  -H "Content-Type: application/json" \
  -d '{
    "metric_id": "my_metric",
    "targets": ["device001"],
    "time_range": "6h"
  }'
```

See [METRICS.md](METRICS.md) for complete guide.

## Debugging

### Backend Debugging

#### View Logs

```bash
make logs

# Or specific service:
docker compose logs -f backend
```

#### Enable Debug Logging

Edit `src/rackscope/logging_config.py`:

```python
level = logging.DEBUG  # Change from INFO
```

Restart: `make restart`

#### Interactive Debugging

Add breakpoint in code:

```python
import pdb; pdb.set_trace()
```

Attach to container:

```bash
docker compose attach backend
```

#### Test Prometheus Queries

Test queries directly in Prometheus:

```bash
# Open: http://localhost:9090
# Query: up{instance="compute001"}
```

### Frontend Debugging

#### Browser Console

Open browser DevTools (F12) → Console tab

#### React DevTools

Install [React Developer Tools](https://react.dev/learn/react-developer-tools)

#### Network Requests

Open browser DevTools → Network tab

Filter by `/api` to see backend requests.

#### Component State

Use React DevTools → Components tab

### Common Issues

#### Backend Not Starting

```bash
# Check logs
make logs | grep backend

# Common causes:
# - Syntax error in Python code
# - Missing dependency (rebuild: make build)
# - Port 8000 already in use
```

#### Frontend Not Loading

```bash
# Check logs
make logs | grep frontend

# Common causes:
# - Syntax error in TypeScript/React code
# - Missing npm package (rebuild: make build)
# - Port 5173 already in use
```

#### Metrics Not Showing

1. **Check Prometheus has data**:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up{instance="compute001"}'
   ```

2. **Check metric definition**:
   ```bash
   curl http://localhost:8000/api/metrics/library/my_metric
   ```

3. **Check template references metric**:
   ```bash
   curl http://localhost:8000/api/catalog | jq '.devices[] | select(.id=="my-device") | .metrics'
   ```

## Testing

### Backend Tests

```bash
# Run all tests
make test

# Run specific test file
docker compose exec backend pytest tests/api/test_topology.py

# Run with verbose output
docker compose exec backend pytest -v

# Run tests matching pattern
docker compose exec backend pytest -k "test_rack"

# Run with coverage
docker compose exec backend pytest --cov=rackscope --cov-report=html
```

### Test Structure

```
tests/
├── api/              # API endpoint tests
│   ├── test_topology.py
│   ├── test_catalog.py
│   └── test_metrics.py
├── model/            # Model validation tests
│   ├── test_domain.py
│   ├── test_catalog.py
│   └── test_metrics.py
├── services/         # Service layer tests
│   ├── test_topology_service.py
│   └── test_metrics_service.py
├── plugins/          # Plugin tests
│   ├── test_simulator_plugin.py
│   └── test_slurm_plugin.py
└── conftest.py       # Shared fixtures
```

### Writing Tests

```python
# tests/api/test_my_endpoint.py
import pytest
from fastapi.testclient import TestClient
from rackscope.api.app import app

client = TestClient(app)

def test_my_endpoint():
    response = client.get("/api/my-endpoint")
    assert response.status_code == 200
    assert response.json()["key"] == "value"

def test_my_endpoint_not_found():
    response = client.get("/api/my-endpoint/invalid")
    assert response.status_code == 404
```

### Fixtures

```python
# tests/conftest.py
import pytest
from rackscope.model.domain import Topology, Site, Room

@pytest.fixture
def sample_topology():
    return Topology(
        sites=[
            Site(
                id="dc1",
                name="Datacenter 1",
                rooms=[
                    Room(id="room1", name="Room 1", aisles=[])
                ]
            )
        ]
    )

@pytest.fixture
def sample_catalog():
    # ... create catalog
    return catalog
```

## Code Style

### Python (Backend)

**Formatter**: `ruff format`
**Linter**: `ruff check`

**Style Guide**:
- Line length: 100 characters
- Imports: sorted with `isort`
- Type hints: preferred but not mandatory
- Docstrings: Google style

**Example**:

```python
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from rackscope.model.domain import Rack


class RackResponse(BaseModel):
    """Response model for rack endpoint."""

    id: str
    name: str
    devices: List[str]


router = APIRouter(prefix="/api/racks", tags=["racks"])


@router.get("/{rack_id}")
async def get_rack(rack_id: str) -> RackResponse:
    """
    Get rack by ID.

    Args:
        rack_id: Rack identifier

    Returns:
        Rack response with devices

    Raises:
        HTTPException: If rack not found
    """
    # Implementation
    pass
```

### TypeScript (Frontend)

**Linter**: ESLint
**Formatter**: Prettier

**Style Guide**:
- Line length: 100 characters
- Quotes: Single quotes
- Semicolons: Always
- Arrow functions: Preferred

**Example**:

```typescript
import React from 'react';

interface MyComponentProps {
  title: string;
  count: number;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, count, onAction }) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleClick = () => {
    setIsLoading(true);
    onAction?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p>Count: {count}</p>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Action'}
      </button>
    </div>
  );
};
```

## Git Workflow

### Branching

- `main`: Stable releases
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code improvements

```bash
git checkout -b feature/my-feature
# Make changes
git add .
git commit -m "feat(scope): add my feature"
git push origin feature/my-feature
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

**Examples**:

```bash
feat(plugins): add IPMI monitoring plugin
fix(api): correct rack state calculation
docs(metrics): add metrics library guide
refactor(telemetry): simplify query builder
test(plugins): add plugin lifecycle tests
```

### Pull Requests

1. Create feature branch
2. Make changes with tests
3. Run quality checks: `make quality`
4. Push and create PR
5. Wait for CI checks
6. Address review comments
7. Merge to main

## CI/CD

### GitHub Actions

Located in `.github/workflows/`:

- `test.yml`: Run tests on push/PR
- `lint.yml`: Run linters on push/PR
- `build.yml`: Build Docker images
- `deploy.yml`: Deploy on tag

### Running CI Checks Locally

```bash
# Run what CI will run
make lint
make typecheck
make test
make coverage
```

## Documentation

### Updating Documentation

Documentation lives in `docs/`:

- `API_REFERENCE.md`: API endpoints
- `ARCHITECTURE.md`: System architecture
- `ADMIN_GUIDE.md`: Configuration guide
- `USER_GUIDE.md`: User documentation
- `PLUGINS.md`: Plugin development
- `METRICS.md`: Metrics library
- `DEVELOPMENT.md`: This file
- `SIMULATOR.md`: Simulator guide

**When to update**:
- New API endpoint → Update `API_REFERENCE.md`
- New plugin → Update `PLUGINS.md`
- New metric → Update `METRICS.md`
- Architecture change → Update `ARCHITECTURE.md`

### Documentation Format

Use Markdown with:
- Clear headings (`##`, `###`)
- Code blocks with language hints
- Tables for structured data
- Links to related docs

## Performance

### Profiling Backend

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Code to profile

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

### Profiling Frontend

Use React DevTools Profiler:

1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Perform actions
5. Stop recording
6. Analyze flame graph

### Optimizing Queries

```python
# ❌ Bad: Multiple queries
for device in devices:
    result = await prom_client.query(f'up{{instance="{device.instance}"}}')

# ✅ Good: Single batch query
instances = "|".join([d.instance for d in devices])
result = await prom_client.query(f'up{{instance=~"{instances}"}}')
```

## Contributing

### Before Submitting PR

- [ ] Run `make quality` (all checks pass)
- [ ] Add tests for new features
- [ ] Update documentation
- [ ] Follow code style guidelines
- [ ] Write clear commit messages
- [ ] No console.log / print statements

### Code Review Checklist

- [ ] Code is well-structured and readable
- [ ] Tests cover main cases
- [ ] Documentation is updated
- [ ] No performance regressions
- [ ] Security considerations addressed
- [ ] Error handling is proper

## Resources

### Documentation

- [CLAUDE.md](../CLAUDE.md) - Claude Code instructions
- [AGENTS.md](../AGENTS.md) - AI development rules
- [README.md](../README.md) - Project overview

### Architecture

- `ARCHITECTURE/plans/CONSOLIDATED_ROADMAP.md` - Development roadmap
- `ARCHITECTURE/plans/PLUGIN_ARCHITECTURE.md` - Plugin design
- `ARCHITECTURE/phases/` - Phase implementation plans

### External

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prometheus Docs](https://prometheus.io/docs/)

## Support

### Getting Help

1. Check documentation in `docs/`
2. Search existing issues on GitHub
3. Ask in team chat/Slack
4. Create GitHub issue

### Reporting Bugs

Include:
- Description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs (`make logs`)
- Environment (OS, Docker version)

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Additional context

---

**Happy coding!** 🚀
