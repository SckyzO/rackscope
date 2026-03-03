---
id: testing
title: Testing Guide
sidebar_position: 1
---

# Testing Guide

Rackscope uses **pytest** for backend testing. All tests run inside Docker containers — no local Python installation needed.

## Running Tests

### All tests

```bash
make test
```

Runs `pytest` inside the `backend` container. The stack must be running (`make up`).

### With coverage report

```bash
make coverage
```

Generates:
- Terminal coverage summary
- HTML report at `htmlcov/index.html` (open in browser)

### Specific file or test

```bash
# Specific file
docker compose -f docker-compose.dev.yml exec backend pytest tests/test_api.py -v

# Specific function
docker compose -f docker-compose.dev.yml exec backend pytest tests/test_api.py::test_healthz -v

# With debug output
docker compose -f docker-compose.dev.yml exec backend pytest -v -s
```

### All quality checks (lint + typecheck + tests + coverage)

```bash
make quality
```

## Test Structure

```
tests/
├── test_api.py              # Smoke / integration tests (API endpoints)
├── test_model.py            # Pydantic model validation
├── test_planner.py          # TelemetryPlanner unit tests (including expand_by_label)
├── test_topology_service.py # Topology service tests
├── api/                     # Router-level tests (7 files)
│   ├── test_topology.py
│   ├── test_catalog.py
│   ├── test_checks.py
│   ├── test_telemetry.py
│   ├── test_simulator.py
│   ├── test_slurm.py
│   └── test_metrics.py
├── services/                # Service-level tests (4 files)
│   ├── test_topology_service.py
│   ├── test_telemetry_service.py
│   ├── test_instance_service.py
│   └── test_metrics_service.py
├── model/                   # Model tests
│   └── test_metrics.py
├── utils/                   # Utility tests
│   ├── test_aggregation.py
│   └── test_validation.py
└── plugins/                 # Plugin system tests
    ├── test_base.py         # RackscopePlugin base class
    ├── test_registry.py     # PluginRegistry lifecycle
    └── test_plugins_router.py  # /api/plugins endpoints
```

**Current metrics**: 362 tests passing, ~66% coverage.

## Writing Tests

### API tests with TestClient

```python
from fastapi.testclient import TestClient
from rackscope.api.app import app

client = TestClient(app)

def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200

def test_get_sites():
    response = client.get("/api/sites")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
```

### Model validation tests

```python
from rackscope.model.domain import Device

def test_device_instance_field():
    """instance field accepts str, list, and dict."""
    # String nodeset
    d = Device(id="d1", name="Node 1", template_id="tpl", u_position=1, height=1, instance="compute[001-004]")
    assert d.instance == "compute[001-004]"

    # List
    d2 = Device(id="d2", name="Node 2", template_id="tpl", u_position=1, height=1, instance=["n1", "n2"])
    assert d2.instance == ["n1", "n2"]
```

### Planner tests with mocked Prometheus

```python
from unittest.mock import AsyncMock, patch
from rackscope.telemetry.planner import TelemetryPlanner

async def test_planner_snapshot(topology, checks_library, catalog):
    with patch("rackscope.telemetry.prometheus.PrometheusClient.query") as mock_query:
        mock_query.return_value = [{"metric": {"instance": "compute001"}, "value": [0, "1"]}]
        planner = TelemetryPlanner(prom_url="http://localhost:9090")
        snapshot = await planner.get_snapshot(topology, checks_library, {})
        assert "compute001" in snapshot.node_states
```

## Coverage Goals

| Scope | Target | Current |
|---|---|---|
| Overall | ≥ 70% | ~66% |
| `api/` routers | ≥ 80% | tracked |
| `model/` | ≥ 90% | tracked |
| `services/` | ≥ 70% | tracked |
| `plugins/` | ≥ 60% | tracked |

Run `make coverage` to see current per-module coverage.

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
