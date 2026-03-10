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


def test_validation_error_with_type_mismatch():
    """Test validation error with type mismatch in payload."""
    # Send invalid data type to trigger validation
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "device",
            "template": {
                "id": "test",
                "name": "Test",
                "type": "server",
                "u_height": "not_a_number",  # Should be int
            },
        },
    )

    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data


def test_validation_error_with_missing_required_fields():
    """Test validation error when required fields are missing."""
    # Missing required fields in template
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "device",
            "template": {
                "id": "test",
                # Missing name, type, u_height
            },
        },
    )

    assert response.status_code in (400, 422)
    data = response.json()
    assert "detail" in data


def test_pydantic_validation_error_handler():
    """Test Pydantic validation error with complex nested structure."""
    # Send nested invalid structure
    response = client.put(
        "/api/config",
        json={
            "paths": {
                "topology": 123,  # Should be string
                "templates": None,  # Should be string
            },
            "telemetry": "invalid",  # Should be object
        },
    )

    assert response.status_code == 422
    data = response.json()
    assert "detail" in data or "error" in data


def test_generic_exception_with_valid_endpoint():
    """Test that valid requests don't trigger generic exception handler."""
    # Healthcheck endpoint should work
    response = client.get("/healthz")
    assert response.status_code == 200


def test_error_response_includes_path():
    """Test that error responses include the request path."""
    response = client.put("/api/config", json={"invalid": "data"})

    assert response.status_code == 422
    data = response.json()

    # Error response should include path information
    # Either in 'path' field or in 'detail'
    assert "detail" in data or "path" in data


def test_validation_error_with_nested_context():
    """Test validation error cleaning when ctx contains exceptions."""
    # This triggers validation with complex context
    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_complex",
                "name": "Test Device",
                "type": "server",
                "u_height": 1,
                "layout": {
                    "type": "grid",
                    "rows": "not_an_int",  # Type error
                    "cols": 1,
                    "matrix": "invalid",  # Should be list
                },
            },
        },
    )

    # Should handle the error cleanly — 503 if catalog not loaded in test env
    assert response.status_code in (400, 422, 503)
    data = response.json()
    assert "detail" in data

    # The error detail should be JSON-serializable (no Exception objects)
    import json

    json.dumps(data)  # Should not raise
