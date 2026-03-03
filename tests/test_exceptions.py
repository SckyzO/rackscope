"""Tests for Exception Handlers."""

from fastapi.testclient import TestClient

from rackscope.api.app import app

client = TestClient(app)


def test_validation_error_handler():
    """Test that invalid request data triggers validation error handler (422)."""
    # Try to update config with invalid data
    # The PUT /api/config endpoint expects a valid AppConfig structure
    response = client.put("/api/config", json={"invalid": "data"})

    # Should return 422 Unprocessable Entity
    assert response.status_code == 422
    data = response.json()

    # Should have error structure
    assert "error" in data or "detail" in data
    # FastAPI validation errors typically have 'detail' field
    if "detail" in data:
        assert isinstance(data["detail"], list)


def test_validation_error_response_structure():
    """Test that validation error response has expected JSON structure."""
    # Send malformed JSON to an endpoint that validates input
    response = client.put("/api/config", json={"refresh": "not_an_object"})

    assert response.status_code == 422
    data = response.json()

    # Check error response structure
    # FastAPI returns {"detail": [...]} for validation errors
    assert "detail" in data
    assert isinstance(data["detail"], list)

    # Each error should have type, loc, msg fields
    if len(data["detail"]) > 0:
        error = data["detail"][0]
        # Standard FastAPI validation error fields
        assert "type" in error or "loc" in error or "msg" in error
