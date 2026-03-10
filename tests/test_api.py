"""
Integration smoke tests for core API endpoints.

These tests hit the live FastAPI app without mocking the global state, so
they depend on the topology loaded by the backend at startup.  For more
targeted unit tests with controlled state, see tests/api/.
"""

from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from rackscope.api.app import app
from rackscope.model.loader import load_topology

client = TestClient(app)


def _load_topology():
    # Try real topology first, fall back to hpc-cluster example
    for path_str in ["config/topology", "config/examples/hpc-cluster/topology"]:
        config_path = Path(path_str)
        if config_path.exists():
            return load_topology(config_path)
    raise FileNotFoundError("No topology directory found")


def _first_room_id():
    topo = _load_topology()
    for site in topo.sites:
        for room in site.rooms:
            return room.id
    return None


def _first_rack_id():
    topo = _load_topology()
    for site in topo.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    return rack.id
            for rack in room.standalone_racks:
                return rack.id
    return None


def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_sites():
    response = client.get("/api/sites")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_rooms():
    response = client.get("/api/rooms")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_room_state():
    room_id = _first_room_id()
    if not room_id:
        pytest.skip("No rooms available in topology")
    response = client.get(f"/api/rooms/{room_id}/state")
    assert response.status_code == 200
    body = response.json()
    assert "state" in body
    assert isinstance(body.get("racks", {}), dict)


def test_get_rack_state():
    rack_id = _first_rack_id()
    if not rack_id:
        pytest.skip("No racks available in topology")
    response = client.get(f"/api/racks/{rack_id}/state")
    assert response.status_code == 200
    body = response.json()
    assert body["state"] in {"OK", "WARN", "CRIT", "UNKNOWN"}
    assert "nodes" in body


# ── Wizard disable endpoint ────────────────────────────────────────────────────


@pytest.fixture()
def _protect_app_yaml():
    path = "config/app.yaml"
    try:
        with open(path) as f:
            original = f.read()
    except FileNotFoundError:
        original = None
    yield
    if original is not None:
        with open(path, "w") as f:
            f.write(original)


def test_wizard_disable_endpoint_exists(_protect_app_yaml):
    """POST /api/setup/wizard/disable is reachable — app.yaml restored after."""
    resp = client.post("/api/setup/wizard/disable")
    assert resp.status_code != 404


def test_wizard_disable_returns_json(_protect_app_yaml):
    """Response body contains wizard field — app.yaml restored after."""
    resp = client.post("/api/setup/wizard/disable")
    data = resp.json()
    assert "wizard" in data


# ── Main entrypoint test ──────────────────────────────────────────────────────


def test_main_entrypoint():
    """Test that __main__.py entrypoint runs without error."""
    from rackscope.__main__ import main

    main()  # should not raise
