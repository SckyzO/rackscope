# Testing Guide

This document describes the testing strategy and guidelines for Rackscope.

## Overview

Rackscope uses **pytest** for backend testing and aims for **70%+ code coverage**.

## Running Tests

### All Tests

```bash
make test
```

This runs: `docker compose exec backend pytest`

### With Coverage

```bash
make coverage
```

This generates:
- Terminal coverage report
- HTML report in `htmlcov/index.html`

### Specific Test File

```bash
docker compose exec backend pytest tests/test_api.py
```

### Specific Test Function

```bash
docker compose exec backend pytest tests/test_api.py::test_healthz -v
```

### With Debug Output

```bash
docker compose exec backend pytest -v -s
```

---

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures
├── test_api.py              # Legacy API tests (to be split)
├── test_model.py            # Model validation tests
├── test_planner.py          # Telemetry planner tests
├── api/                     # API router tests
│   ├── test_topology_router.py
│   ├── test_catalog_router.py
│   ├── test_checks_router.py
│   ├── test_telemetry_router.py
│   ├── test_slurm_router.py
│   ├── test_simulator_router.py
│   └── test_config_router.py
├── services/                # Service layer tests
│   ├── test_topology_service.py
│   ├── test_slurm_service.py
│   ├── test_telemetry_service.py
│   └── test_instance_service.py
├── utils/                   # Utility function tests
│   ├── test_validation.py
│   ├── test_aggregation.py
│   └── test_path_utils.py
├── model/                   # Model tests
│   ├── test_domain.py
│   ├── test_catalog.py
│   ├── test_checks.py
│   └── test_config.py
└── integration/             # Integration tests
    └── test_workflows.py
```

---

## Testing Guidelines

### 1. Test Organization

- **Unit tests**: Test individual functions/methods in isolation
- **Integration tests**: Test complete workflows across multiple components
- **API tests**: Test HTTP endpoints with FastAPI TestClient

### 2. Fixture Usage

Use pytest fixtures for common setup:

```python
import pytest
from fastapi.testclient import TestClient
from rackscope.api.app import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_topology():
    return Topology(sites=[...])

def test_get_sites(client, sample_topology):
    # Override dependency
    app.dependency_overrides[get_topology] = lambda: sample_topology
    response = client.get("/api/sites")
    assert response.status_code == 200
```

### 3. Dependency Injection Testing

Use FastAPI dependency overrides to inject test data:

```python
from rackscope.api.dependencies import get_topology

def test_endpoint_with_mock_topology(client):
    mock_topology = Topology(sites=[...])

    app.dependency_overrides[get_topology] = lambda: mock_topology

    response = client.get("/api/sites")
    assert response.status_code == 200

    # Clean up
    app.dependency_overrides.clear()
```

### 4. Async Testing

Use `pytest-asyncio` for testing async functions:

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result == expected
```

### 5. Mocking External Dependencies

Mock Prometheus queries:

```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_prometheus_query():
    mock_response = {"status": "success", "data": {"result": []}}

    with patch('rackscope.telemetry.prometheus.client.query',
               new_callable=AsyncMock,
               return_value=mock_response):
        result = await client.query("up")
        assert result["status"] == "success"
```

### 6. Validation Testing

Test Pydantic models with invalid data:

```python
import pytest
from pydantic import ValidationError
from rackscope.model.domain import Device

def test_device_validation():
    with pytest.raises(ValidationError) as exc_info:
        Device(
            id="",  # Invalid: empty
            name="Test",
            template_id="template-1",
            u_position=1
        )
    assert "id" in str(exc_info.value)
```

### 7. Test Data

Use realistic test data that matches production patterns:

```python
SAMPLE_TOPOLOGY = {
    "sites": [
        {
            "id": "dc1",
            "name": "Datacenter 1",
            "rooms": [
                {
                    "id": "room-a",
                    "name": "Room A",
                    "aisles": [...]
                }
            ]
        }
    ]
}
```

---

## Coverage Goals

### Overall Target

- **Minimum**: 70% overall coverage
- **Critical modules**: 80%+ coverage
  - `api/routers/`
  - `services/`
  - `model/`

### Viewing Coverage

```bash
# Generate coverage report
make coverage

# Open HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

### Coverage Exceptions

Some code paths may be excluded from coverage:

- Error handling for rare edge cases
- Logging statements
- Type checking branches
- Deprecated code paths (marked with TODO)

Mark exceptions with `# pragma: no cover`:

```python
except Exception as e:  # pragma: no cover
    logger.critical(f"Unexpected error: {e}")
    raise
```

---

## Continuous Testing

### Watch Mode (during development)

```bash
docker compose exec backend pytest --watch
```

### Pre-Commit Testing

Before committing, run:

```bash
make lint
make typecheck
make test
```

Or all at once:

```bash
make quality
```

---

## Common Testing Patterns

### Testing API Endpoints

```python
def test_create_site(client):
    payload = {"name": "Test Site"}
    response = client.post("/api/topology/sites", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["site"]["name"] == "Test Site"
```

### Testing Services

```python
def test_topology_service():
    topology = sample_topology()
    rack = find_rack_by_id(topology, "r01-01")
    assert rack is not None
    assert rack.id == "r01-01"
```

### Testing Error Cases

```python
def test_invalid_rack_id(client):
    response = client.get("/api/racks/invalid-rack")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

### Testing Validators

```python
def test_safe_segment():
    assert safe_segment("My Site!", "fallback") == "my-site"
    assert safe_segment("", "fallback") == "fallback"
    assert safe_segment("   ", "fallback") == "fallback"
```

---

## Troubleshooting Tests

### Tests Hanging

If tests hang, check for:
- Infinite loops
- Unresolved async operations
- Deadlocks in cache/lock mechanisms

### Import Errors

Ensure backend container has all dependencies:

```bash
docker compose exec backend pip install -e ".[dev]"
```

### Database/State Issues

Tests should not depend on shared state. Use:
- Fresh fixtures for each test
- Dependency overrides for isolation
- `app.dependency_overrides.clear()` in teardown

---

## Best Practices

1. **Test One Thing**: Each test should verify a single behavior
2. **Clear Names**: Use descriptive test function names
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Fast Tests**: Mock external dependencies (Prometheus, file I/O)
5. **Independent Tests**: Tests should not depend on execution order
6. **Readable Assertions**: Use clear assertion messages
7. **Edge Cases**: Test boundary conditions and error paths

---

## Next Steps

As refactoring progresses, we will:

1. Split `test_api.py` into router-specific test files
2. Add service layer tests
3. Achieve 70%+ coverage
4. Add integration tests for complete workflows
5. Add performance benchmarks (optional)

---

**For detailed refactoring plan, see `REFACTORING_ROADMAP.md`**
