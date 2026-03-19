"""Tests for System Router."""

import pytest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import _is_trusted_ip
from rackscope.api.routers.system import (
    _fetch_process_stats_raw,
    _parse_backend_stats,
    _query_prom_process_stats,
    _read_proc_metric,
)

client = TestClient(app)


# ── GET /api/system/status — always public ────────────────────────────────────


def test_get_system_status():
    """GET /api/system/status is public and always returns 200."""
    response = client.get("/api/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "pid" in data
    assert isinstance(data["pid"], int)


# ── _is_trusted_ip unit tests ─────────────────────────────────────────────────


def test_is_trusted_ip_empty_list_allows_all():
    """Empty trusted_networks list always returns True (no restriction)."""
    assert _is_trusted_ip("1.2.3.4", []) is True
    assert _is_trusted_ip("192.168.1.50", []) is True


def test_is_trusted_ip_exact_match():
    """Exact IP match returns True."""
    assert _is_trusted_ip("127.0.0.1", ["127.0.0.1"]) is True
    assert _is_trusted_ip("10.0.0.1", ["127.0.0.1"]) is False


def test_is_trusted_ip_cidr_match():
    """IP inside a CIDR block returns True."""
    assert _is_trusted_ip("172.17.0.1", ["172.16.0.0/12"]) is True
    assert _is_trusted_ip("10.0.0.99", ["10.0.0.0/24"]) is True
    assert _is_trusted_ip("10.0.1.1", ["10.0.0.0/24"]) is False


def test_is_trusted_ip_multiple_networks():
    """Returns True if IP matches any entry in the list."""
    networks = ["127.0.0.1", "192.168.0.0/16"]
    assert _is_trusted_ip("192.168.50.10", networks) is True
    assert _is_trusted_ip("8.8.8.8", networks) is False


def test_is_trusted_ip_invalid_host_returns_false():
    """Invalid host string returns False without raising."""
    assert _is_trusted_ip("not-an-ip", ["127.0.0.0/8"]) is False
    assert _is_trusted_ip("", ["127.0.0.1"]) is False


def test_is_trusted_ip_invalid_cidr_skipped():
    """Invalid CIDR entries are skipped; valid ones still evaluated."""
    assert _is_trusted_ip("127.0.0.1", ["not-valid-cidr", "127.0.0.0/8"]) is True
    assert _is_trusted_ip("8.8.8.8", ["not-valid-cidr"]) is False


# ── POST /api/system/restart — require_admin guard ────────────────────────────


def test_restart_open_when_trusted_networks_empty():
    """Restart is accessible when auth is disabled and trusted_networks is empty."""
    with patch("rackscope.api.app.APP_CONFIG") as mock_cfg:
        mock_cfg.auth.enabled = False
        mock_cfg.auth.trusted_networks = []
        response = client.post("/api/system/restart")
    # Guard passed — 200 or 500 (file touch may fail in test), never 403
    assert response.status_code in (200, 500)


def test_restart_denied_when_ip_not_in_trusted_networks():
    """Restart returns 403 when trusted_networks is set and client IP is not listed."""
    with patch("rackscope.api.app.APP_CONFIG") as mock_cfg:
        mock_cfg.auth.enabled = False
        mock_cfg.auth.trusted_networks = ["192.168.0.0/16"]
        # TestClient uses 127.0.0.1 as client IP — not in 192.168.0.0/16
        response = client.post("/api/system/restart")
    assert response.status_code == 403
    assert "trusted" in response.json()["detail"].lower()


def test_require_admin_allows_trusted_ip():
    """require_admin does not raise when client IP is in trusted_networks."""
    from unittest.mock import MagicMock
    from rackscope.api.dependencies import require_admin

    mock_request = MagicMock()
    mock_request.state.user = None
    mock_request.client.host = "192.168.1.50"

    with patch("rackscope.api.app.APP_CONFIG") as mock_cfg:
        mock_cfg.auth.enabled = False
        mock_cfg.auth.trusted_networks = ["192.168.0.0/16"]
        # Should not raise — IP is inside the trusted CIDR
        require_admin(mock_request)


def test_process_stats_always_accessible():
    """GET /api/system/process-stats is public — no guard (monitoring scrape use case)."""
    with patch("rackscope.api.app.APP_CONFIG") as mock_cfg:
        mock_cfg.auth.enabled = False
        mock_cfg.auth.trusted_networks = ["10.0.0.0/8"]
        response = client.get("/api/system/process-stats")
    # Guard is NOT applied — should never return 403 regardless of trusted_networks
    assert response.status_code != 403


def test_restart_backend_legacy():
    """POST /api/system/restart still works when no APP_CONFIG loaded (backward compat)."""
    with patch("rackscope.api.app.APP_CONFIG", None):
        response = client.post("/api/system/restart")
    assert response.status_code in (200, 500)
    assert response.status_code != 403


# ── Unit tests for private helpers ────────────────────────────────────────────


def test_read_proc_metric_non_float_value():
    """_read_proc_metric returns None when value is not parseable as float."""
    text = "process_resident_memory_bytes not-a-number\n"
    result = _read_proc_metric(text, "process_resident_memory_bytes")
    assert result is None


def test_read_proc_metric_no_match():
    """_read_proc_metric returns None when metric name is not found."""
    text = "other_metric 42.0\n"
    result = _read_proc_metric(text, "process_resident_memory_bytes")
    assert result is None


def test_parse_backend_stats_file_not_found():
    """_parse_backend_stats handles missing /proc files gracefully."""
    with patch("builtins.open", side_effect=FileNotFoundError("no proc")):
        result = _parse_backend_stats()
    assert result["memory_bytes"] is None
    assert result["cpu_seconds"] is None
    assert result["available"] is True


def test_parse_backend_stats_generic_exception():
    """_parse_backend_stats handles unexpected exceptions gracefully."""
    with patch("builtins.open", side_effect=OSError("permission denied")):
        result = _parse_backend_stats()
    assert result["available"] is True


@pytest.mark.asyncio
async def test_fetch_process_stats_raw_exception():
    """_fetch_process_stats_raw returns unavailable dict on any exception."""
    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(side_effect=Exception("refused"))
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await _fetch_process_stats_raw("http://unreachable:9999/metrics")
    assert result == {"memory_bytes": None, "cpu_seconds": None, "available": False}


@pytest.mark.asyncio
async def test_query_prom_process_stats_with_results():
    """_query_prom_process_stats extracts float values from Prometheus results."""
    import httpx
    from unittest.mock import MagicMock

    mem_resp = MagicMock(spec=httpx.Response)
    mem_resp.json.return_value = {"data": {"result": [{"value": [0, "134217728.0"]}]}}
    cpu_resp = MagicMock(spec=httpx.Response)
    cpu_resp.json.return_value = {"data": {"result": [{"value": [0, "42.5"]}]}}

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[mem_resp, cpu_resp])

    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await _query_prom_process_stats("http://prometheus:9090", 'instance="sim"')

    assert result["memory_bytes"] == 134217728.0
    assert result["cpu_seconds"] == 42.5
    assert result["available"] is True


@pytest.mark.asyncio
async def test_query_prom_process_stats_exception():
    """_query_prom_process_stats returns unavailable dict on exception."""
    with patch("httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(side_effect=Exception("timeout"))
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        result = await _query_prom_process_stats("http://prometheus:9090", 'instance="x"')
    assert result == {"memory_bytes": None, "cpu_seconds": None, "available": False}


def test_restart_backend_exception():
    """POST /api/system/restart returns 500 when an exception occurs."""
    with patch("rackscope.api.app.APP_CONFIG") as mock_cfg:
        mock_cfg.auth.enabled = False
        mock_cfg.auth.trusted_networks = []
        with patch(
            "pathlib.Path.exists",
            side_effect=Exception("mock file error"),
        ):
            response = client.post("/api/system/restart")
    assert response.status_code == 500
    assert "Failed to restart" in response.json()["detail"]
