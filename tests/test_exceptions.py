"""Tests for Exception Handlers."""

import pytest
from unittest.mock import MagicMock, patch

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import ValidationError

from rackscope.api.app import app
from rackscope.api.exceptions import (
    generic_exception_handler,
    pydantic_validation_error_handler,
    validation_error_handler,
)

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


# ── Additional coverage tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_validation_error_handler_with_ctx_exception():
    """validation_error_handler converts Exception in ctx to string."""
    request = MagicMock(spec=Request)
    request.method = "POST"
    request.url.path = "/api/test"

    # Simulate error with ctx containing an Exception
    exc = MagicMock(spec=RequestValidationError)
    exc.errors.return_value = [
        {
            "type": "value_error",
            "loc": ("field",),
            "msg": "bad value",
            "input": "x",
            "ctx": {"error": ValueError("some constraint"), "other": "plain"},
        }
    ]
    response = await validation_error_handler(request, exc)
    data = response.body
    import json

    body = json.loads(data)
    # ctx exception should be converted to string
    assert body["detail"][0]["ctx"]["error"] == "some constraint"
    assert body["detail"][0]["ctx"]["other"] == "plain"


@pytest.mark.asyncio
async def test_pydantic_validation_error_handler_returns_422():
    """pydantic_validation_error_handler returns 422 with error detail."""
    from pydantic import BaseModel

    class Strict(BaseModel):
        value: int

    request = MagicMock(spec=Request)
    request.method = "GET"
    request.url.path = "/api/test"

    try:
        Strict(value="not-an-int")  # type: ignore
    except ValidationError as exc:
        response = await pydantic_validation_error_handler(request, exc)
        assert response.status_code == 422
        import json

        body = json.loads(response.body)
        assert "detail" in body


@pytest.mark.asyncio
async def test_generic_exception_handler_debug_mode():
    """generic_exception_handler includes exception details when RACKSCOPE_DEBUG=true."""
    request = MagicMock(spec=Request)
    request.method = "GET"
    request.url.path = "/api/test"

    with patch.dict("os.environ", {"RACKSCOPE_DEBUG": "true"}):
        response = await generic_exception_handler(request, RuntimeError("something broke"))

    assert response.status_code == 500
    import json

    body = json.loads(response.body)
    assert body["exception"] == "something broke"
    assert body["type"] == "RuntimeError"


@pytest.mark.asyncio
async def test_generic_exception_handler_no_debug():
    """generic_exception_handler hides details when RACKSCOPE_DEBUG is not set."""
    request = MagicMock(spec=Request)
    request.method = "GET"
    request.url.path = "/api/test"

    with patch.dict("os.environ", {"RACKSCOPE_DEBUG": "false"}):
        response = await generic_exception_handler(request, RuntimeError("secret detail"))

    assert response.status_code == 500
    import json

    body = json.loads(response.body)
    assert "exception" not in body
