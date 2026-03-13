"""Tests for System Router."""

from fastapi.testclient import TestClient

from rackscope.api.app import app

client = TestClient(app)


def test_get_system_status():
    """Test GET /api/system/status returns status info."""
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "running"
    assert "pid" in data
    assert isinstance(data["pid"], int)


def test_restart_backend():
    """Test POST /api/system/restart endpoint exists and responds."""
    response = client.post("/api/system/restart")
    # Should return 200 with success message or 500 if not in reload mode
    # but must not be 404 (not found)
    assert response.status_code in (200, 500)
    data = response.json()
    # If 200, should have success message
    if response.status_code == 200:
        assert "status" in data or "message" in data
