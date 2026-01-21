from fastapi.testclient import TestClient
from rackscope.api.app import app
import pytest

client = TestClient(app)

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
    response = client.get("/api/rooms/any/state")
    assert response.status_code == 200
    assert response.json()["state"] == "OK"

def test_get_rack_state():
    response = client.get("/api/racks/crit-rack/state")
    assert response.status_code == 200
    assert response.json()["state"] == "CRIT"
    
    response = client.get("/api/racks/ok-rack/state")
    assert response.status_code == 200
    assert response.json()["state"] == "OK"
