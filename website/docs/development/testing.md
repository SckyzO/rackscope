---
id: testing
title: Testing Guide
sidebar_position: 1
---

# Testing Guide

Rackscope uses **pytest** for backend testing. All tests run inside Docker containers — no local Python installation needed.

## Running Tests

### All tests (quiet)

```bash
make test
```

Runs `pytest -q` inside the `backend` container. The stack must be running (`make up`).

### Verbose output

```bash
make test-v
```

Shows each test name as it runs — useful for debugging specific failures.

### Filter by keyword

```bash
make test-k K=planner
make test-k K=auth
make test-k K=for_duration
```

Runs only tests whose name or file matches the keyword.

### Specific file or directory

```bash
make test-file F=tests/test_model.py
make test-file F=tests/api/
```

### With coverage report

```bash
make coverage
```

Generates:
- Terminal coverage summary
- HTML report at `htmlcov/index.html` (open in browser)

### Full CI pipeline

```bash
make ci
```

Runs the complete pre-release pipeline: `quality` (lint + typecheck + complexity + coverage) + `security` (bandit + npm audit + pip-audit).

### All quality checks

```bash
make quality
```

Runs lint + typecheck + complexity + coverage in sequence.

---

## Test Structure

```
tests/
├── test_api.py                     # Smoke / integration tests
├── test_model.py                   # Pydantic model validation (CheckDefinition, Domain)
├── test_planner.py                 # TelemetryPlanner (expand_by_label, for_duration)
├── test_planner_for_duration_extended.py  # for_duration debounce — all scopes
├── test_topology_service.py        # Topology service
├── test_loader.py                  # YAML loader (error paths, segmented topology)
├── test_dependencies.py            # FastAPI dependency injection
├── test_exceptions.py              # HTTP error handlers (422, generic)
├── test_middleware.py              # Auth + logging middleware
├── test_prometheus_client.py       # PrometheusClient (cache, query, errors)
├── api/
│   ├── test_topology_router.py     # Topology CRUD endpoints
│   ├── test_topology_router_extended.py  # Extended CRUD (rooms, aisles, devices)
│   ├── test_catalog_router.py      # Device/rack template management
│   ├── test_checks_router.py       # Checks library + test-query endpoint
│   ├── test_config_router.py       # GET/PUT /api/config, wizard/disable
│   ├── test_auth_router.py         # Login, JWT helpers, change-password/username
│   ├── test_metrics_router.py      # Metrics library and data endpoints
│   ├── test_simulator_router.py    # Simulator plugin endpoints
│   ├── test_slurm_router.py        # Slurm plugin endpoints
│   ├── test_system_router.py       # System status and restart
│   └── test_telemetry_router.py    # Telemetry and health check endpoints
├── model/
│   └── test_metrics.py             # MetricDefinition model
├── services/
│   ├── test_topology_service.py
│   ├── test_telemetry_service.py
│   ├── test_instance_service.py
│   ├── test_metrics_service.py
│   └── test_slurm_service.py
├── plugins/
│   ├── test_base.py                # RackscopePlugin base class
│   ├── test_registry.py            # PluginRegistry lifecycle (shutdown, errors)
│   └── test_plugins_router.py      # /api/plugins endpoints + config file I/O
└── utils/
    ├── test_aggregation.py
    └── test_validation.py
```

**Current metrics**: **683 tests passing, 90% coverage**.

---

## Writing Tests

### API tests with TestClient

```python
from fastapi.testclient import TestClient
from rackscope.api.app import app

client = TestClient(app)

def test_get_sites():
    response = client.get("/api/sites")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

### Model validation tests

```python
from pydantic import ValidationError
from rackscope.model.checks import CheckDefinition
import pytest

def test_check_for_duration_valid():
    c = CheckDefinition.model_validate({
        "id": "node_up", "name": "Node Up", "scope": "node",
        "kind": "server", "expr": 'up{instance=~"$instances"}',
        "output": "bool", "for": "5m",
        "rules": [{"op": "==", "value": 0, "severity": "CRIT"}],
    })
    assert c.for_duration == "5m"

def test_check_invalid_for_duration():
    with pytest.raises(ValidationError):
        CheckDefinition.model_validate({..., "for": "5minutes"})  # invalid format
```

### Async tests with mocked Prometheus

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_planner_crit(basic_topology, catalog):
    checks = _make_for_check(for_duration=None)  # immediate
    planner = TelemetryPlanner(config=PlannerConfig(...))

    with patch("rackscope.telemetry.planner.prom_client") as mock_prom:
        mock_prom.query = AsyncMock(return_value=[
            {"metric": {"instance": "compute001"}, "value": [0, "0"]}
        ])
        snapshot = await planner.get_snapshot(basic_topology, checks, targets)

    assert snapshot.node_states.get("compute001") == "CRIT"
```

### Protecting config files in tests

> **Important**: Tests that call write endpoints (`PUT /api/config`, `POST /api/setup/wizard/disable`) must use the `protect_app_yaml` fixture to prevent corrupting `config/app.yaml`.

```python
import pytest

@pytest.fixture()
def protect_app_yaml():
    """Snapshot app.yaml before the test and restore it after."""
    path = "config/app.yaml"
    with open(path) as f:
        original = f.read()
    yield
    with open(path, "w") as f:
        f.write(original)

def test_wizard_disable(protect_app_yaml):
    resp = client.post("/api/setup/wizard/disable")
    assert resp.status_code in (200, 500)
```

Without this fixture, running the test suite will overwrite your Prometheus URL, paths, and feature flags in `config/app.yaml`.

---

## Coverage Goals

| Scope | Target | Current |
|---|---|---|
| **Overall** | ≥ 85% | **90%** ✅ |
| `api/` routers | ≥ 80% | ~85% ✅ |
| `model/` | ≥ 90% | ~97% ✅ |
| `services/` | ≥ 80% | ~90% ✅ |
| `plugins/` | ≥ 75% | ~88% ✅ |
| `telemetry/` | ≥ 80% | ~88% ✅ |

Run `make coverage` to see current per-module breakdown.

### What is not covered (and why)

Some lines carry `# pragma: no cover` intentionally:

| Pattern | Reason |
|---|---|
| `if __name__ == "__main__"` | CLI entry point — only reachable via direct execution |
| `_update_auth_config()` body | File I/O + asyncio event loop — untestable without full filesystem fixture |
| `delayed_touch()` in system router | Background async task — untestable in unit context |
| `nodes` field fallback in instance_service | Dead code — `instance` field always takes priority |

---

## Type Checking

```bash
make typecheck
```

Runs `mypy` on `src/rackscope/`. Target: **0 errors** (currently achieved).

## Complexity Analysis

```bash
make complexity
```

Runs `radon` (Cyclomatic Complexity). Target: average complexity < 10 per module.
