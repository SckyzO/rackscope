"""Tests for Maintenance Router."""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from rackscope.api.app import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_maintenances_file(tmp_path):
    """Redirect maintenances storage to a tmp dir for each test."""
    config_path = tmp_path / "app.yaml"
    config_path.write_text("# test config\n")
    with patch.dict(os.environ, {"RACKSCOPE_APP_CONFIG": str(config_path)}):
        yield tmp_path


# ── List ──────────────────────────────────────────────────────────────────────


def test_list_maintenances_empty():
    response = client.get("/api/maintenances")
    assert response.status_code == 200
    assert response.json() == {"maintenances": []}


# ── Create ────────────────────────────────────────────────────────────────────


def test_create_maintenance_minimal():
    payload = {
        "target_type": "rack",
        "target_id": "rack-01",
        "reason": "Hardware replacement",
    }
    response = client.post("/api/maintenances", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["target_id"] == "rack-01"
    assert data["target_type"] == "rack"
    assert data["reason"] == "Hardware replacement"
    assert data["effect"] == "badge"
    assert data["status"] == "ACTIVE"
    assert "id" in data


def test_create_maintenance_with_effect_hide():
    payload = {
        "target_type": "device",
        "target_id": "node-42",
        "reason": "Firmware update",
        "effect": "hide",
    }
    response = client.post("/api/maintenances", json=payload)
    assert response.status_code == 201
    assert response.json()["effect"] == "hide"


def test_create_maintenance_with_expiry():
    payload = {
        "target_type": "rack",
        "target_id": "rack-02",
        "reason": "Scheduled work",
        "expires_at": "2099-12-31T23:59:00Z",
    }
    response = client.post("/api/maintenances", json=payload)
    assert response.status_code == 201
    assert response.json()["expires_at"] is not None


def test_create_maintenance_empty_target_id_returns_400():
    payload = {"target_type": "rack", "target_id": "   ", "reason": "Test"}
    response = client.post("/api/maintenances", json=payload)
    assert response.status_code == 400
    assert "target_id" in response.json()["detail"]


def test_create_maintenance_empty_reason_returns_400():
    payload = {"target_type": "rack", "target_id": "rack-01", "reason": "  "}
    response = client.post("/api/maintenances", json=payload)
    assert response.status_code == 400
    assert "reason" in response.json()["detail"]


# ── Stop ──────────────────────────────────────────────────────────────────────


def test_stop_maintenance():
    create_resp = client.post(
        "/api/maintenances",
        json={"target_type": "rack", "target_id": "rack-stop", "reason": "Stop test"},
    )
    assert create_resp.status_code == 201
    maintenance_id = create_resp.json()["id"]

    stop_resp = client.post(f"/api/maintenances/{maintenance_id}/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "EXPIRED"
    assert stop_resp.json()["ended_at"] is not None


def test_stop_already_ended_returns_400():
    create_resp = client.post(
        "/api/maintenances",
        json={"target_type": "rack", "target_id": "rack-double-stop", "reason": "Test"},
    )
    maintenance_id = create_resp.json()["id"]
    client.post(f"/api/maintenances/{maintenance_id}/stop")
    response = client.post(f"/api/maintenances/{maintenance_id}/stop")
    assert response.status_code == 400
    assert "already ended" in response.json()["detail"]


def test_stop_nonexistent_returns_404():
    response = client.post("/api/maintenances/doesnotexist/stop")
    assert response.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


def test_delete_maintenance():
    create_resp = client.post(
        "/api/maintenances",
        json={"target_type": "rack", "target_id": "rack-del", "reason": "Delete test"},
    )
    maintenance_id = create_resp.json()["id"]

    del_resp = client.delete(f"/api/maintenances/{maintenance_id}")
    assert del_resp.status_code == 204

    list_resp = client.get("/api/maintenances")
    ids = [m["id"] for m in list_resp.json()["maintenances"]]
    assert maintenance_id not in ids


def test_delete_nonexistent_returns_404():
    response = client.delete("/api/maintenances/doesnotexist")
    assert response.status_code == 404


# ── List after operations ─────────────────────────────────────────────────────


def test_list_shows_all_maintenances():
    client.post(
        "/api/maintenances",
        json={"target_type": "rack", "target_id": "rack-a", "reason": "Test A"},
    )
    client.post(
        "/api/maintenances",
        json={"target_type": "device", "target_id": "node-b", "reason": "Test B"},
    )

    response = client.get("/api/maintenances")
    assert response.status_code == 200
    ids = [m["target_id"] for m in response.json()["maintenances"]]
    assert "rack-a" in ids
    assert "node-b" in ids
