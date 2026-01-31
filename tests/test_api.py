from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from rackscope.api.app import app
from rackscope.model.loader import load_topology

client = TestClient(app)


def _load_topology():
    config_path = Path("config/topology")
    if config_path.exists():
        return load_topology(config_path)
    return load_topology(Path("config/topology/topology.yaml"))


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
    # Note: this depends on TOPOLOGY being loaded on startup
    # For tests, we might want to inject a mock topology
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
