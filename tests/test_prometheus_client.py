"""
Tests for Prometheus client — caching, query execution, error handling.

Target coverage: 58% → 85%+
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from rackscope.telemetry.prometheus import PrometheusClient


class TestConstructor:
    """Test PrometheusClient initialization."""

    def test_default_constructor(self):
        """Constructor should initialize with default values."""
        client = PrometheusClient()
        assert client.base_url.startswith("http")
        assert client.cache_ttl > 0
        assert client.health_checks_ttl > 0
        assert client.metrics_ttl > 0
        assert isinstance(client._health_cache, dict)
        assert isinstance(client._metrics_cache, dict)
        assert isinstance(client._cache, dict)

    def test_constructor_with_url(self):
        """Constructor should accept custom base URL."""
        client = PrometheusClient("http://custom:9090")
        assert client.base_url == "http://custom:9090"

    def test_constructor_strips_trailing_slash(self):
        """Constructor should strip trailing slash from URL."""
        client = PrometheusClient("http://custom:9090/")
        assert client.base_url == "http://custom:9090"

    def test_constructor_initializes_stats(self):
        """Constructor should initialize statistics counters."""
        client = PrometheusClient()
        assert client._cache_hits == 0
        assert client._cache_misses == 0
        assert client._query_count == 0

    def test_constructor_initializes_latency_tracking(self):
        """Constructor should initialize latency tracking."""
        client = PrometheusClient()
        assert len(client._latency_samples) == 0
        assert client._last_latency_ms is None
        assert client._last_query_ts is None


class TestConfigure:
    """Test PrometheusClient.configure() method."""

    @pytest.mark.asyncio
    async def test_configure_updates_base_url(self):
        """Configure should update base URL."""
        client = PrometheusClient("http://old:9090")
        client.configure(
            base_url="http://new:9090",
            cache_ttl=60.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client.base_url == "http://new:9090"

    @pytest.mark.asyncio
    async def test_configure_updates_cache_ttl(self):
        """Configure should update cache TTL."""
        client = PrometheusClient()
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=120.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client.cache_ttl == 120.0

    @pytest.mark.asyncio
    async def test_configure_updates_health_checks_ttl(self):
        """Configure should update health checks TTL."""
        client = PrometheusClient()
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            health_checks_ttl=45.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client.health_checks_ttl == 45.0

    @pytest.mark.asyncio
    async def test_configure_updates_metrics_ttl(self):
        """Configure should update metrics TTL."""
        client = PrometheusClient()
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            metrics_ttl=180.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client.metrics_ttl == 180.0

    @pytest.mark.asyncio
    async def test_configure_with_auth(self):
        """Configure should accept auth credentials."""
        client = PrometheusClient()
        auth = httpx.BasicAuth("user", "pass")
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            auth=auth,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client._auth == auth

    @pytest.mark.asyncio
    async def test_configure_replaces_client(self):
        """Configure should replace the httpx.AsyncClient instance."""
        client = PrometheusClient()
        old_client = client.client
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
        )
        assert client.client != old_client

    @pytest.mark.asyncio
    async def test_configure_preserves_latency_samples(self):
        """Configure should preserve latency samples up to new window size."""
        client = PrometheusClient()
        client._latency_samples.extend([10.0, 20.0, 30.0, 40.0])
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=2,
        )
        # Should keep only last 2 samples
        assert len(client._latency_samples) <= 2

    @pytest.mark.asyncio
    async def test_configure_updates_debug_stats(self):
        """Configure should update debug_stats flag."""
        client = PrometheusClient()
        client.configure(
            base_url="http://localhost:9090",
            cache_ttl=60.0,
            auth=None,
            verify=True,
            cert=None,
            latency_window=20,
            debug_stats=True,
        )
        assert client._debug_stats is True


@pytest.mark.asyncio
class TestQuery:
    """Test PrometheusClient.query() method."""

    async def test_query_success(self):
        """Query should return successful result."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "resultType": "vector",
                "result": [
                    {"metric": {"instance": "node01"}, "value": [1234567890, "1"]}
                ],
            },
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(
            client.client, "get", return_value=mock_response
        ) as mock_get:
            result = await client.query('up{job="node"}')

        assert isinstance(result, dict)
        assert result["status"] == "success"
        assert "data" in result
        mock_get.assert_called_once()

    async def test_query_cache_hit(self):
        """Second identical query should use cache."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {"resultType": "vector", "result": []},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(
            client.client, "get", return_value=mock_response
        ) as mock_get:
            # First call - cache miss
            result1 = await client.query("up")
            # Second call - cache hit
            result2 = await client.query("up")

        # Should only call HTTP once
        assert mock_get.call_count == 1
        # Results should be identical
        assert result1 == result2
        # Cache stats
        assert client._cache_hits >= 1
        assert client._cache_misses >= 1

    async def test_query_http_error(self):
        """Query should handle HTTP errors gracefully."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=mock_response
        )

        with patch.object(client.client, "get", return_value=mock_response):
            result = await client.query("up")

        assert result["status"] == "error"
        assert "error" in result

    async def test_query_network_error(self):
        """Query should handle network errors gracefully."""
        client = PrometheusClient("http://localhost:9090")

        with patch.object(
            client.client,
            "get",
            side_effect=httpx.ConnectError("Connection refused"),
        ):
            result = await client.query("up")

        assert result["status"] == "error"
        assert "error" in result

    async def test_query_updates_latency(self):
        """Query should track latency."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("up")

        assert client._last_latency_ms is not None
        assert client._last_query_ts is not None
        assert len(client._latency_samples) > 0

    async def test_query_increments_count(self):
        """Query should increment query counter."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        initial_count = client._query_count

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("up")

        assert client._query_count == initial_count + 1

    async def test_query_health_cache(self):
        """Query with cache_type='health' should use health cache."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            result = await client.query("up", cache_type="health")

        # Should be cached in health cache
        assert "up" in client._health_cache
        assert result["status"] == "success"

    async def test_query_metrics_cache(self):
        """Query with cache_type='metrics' should use metrics cache."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            result = await client.query("node_cpu_seconds_total", cache_type="metrics")

        # Should be cached in metrics cache
        assert "node_cpu_seconds_total" in client._metrics_cache
        assert result["status"] == "success"

    async def test_query_generic_cache(self):
        """Query without cache_type should use generic cache."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            result = await client.query("up")

        # Should be cached in generic cache
        assert "up" in client._cache
        assert result["status"] == "success"

    async def test_query_cache_expiry(self):
        """Expired cache entry should trigger new query."""
        client = PrometheusClient("http://localhost:9090")
        client.cache_ttl = 0.01  # Very short TTL

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(
            client.client, "get", return_value=mock_response
        ) as mock_get:
            # First call
            await client.query("up")
            # Wait for cache to expire
            await asyncio.sleep(0.02)
            # Second call - should hit HTTP again
            await client.query("up")

        # Should call HTTP twice due to cache expiry
        assert mock_get.call_count == 2

    async def test_query_in_flight_deduplication(self):
        """Concurrent identical queries should share single HTTP call."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        call_count = 0

        async def slow_get(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)  # Simulate slow query
            return mock_response

        with patch.object(client.client, "get", side_effect=slow_get):
            # Launch multiple concurrent queries
            results = await asyncio.gather(
                client.query("up"),
                client.query("up"),
                client.query("up"),
            )

        # Should only call HTTP once (deduplication)
        assert call_count == 1
        # All results should be identical
        assert results[0] == results[1] == results[2]


@pytest.mark.asyncio
class TestQueryRange:
    """Test PrometheusClient.query_range() method."""

    async def test_query_range_success(self):
        """Range query should return matrix result."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {
                "resultType": "matrix",
                "result": [
                    {
                        "metric": {"instance": "node01"},
                        "values": [[1234567890, "1"], [1234567900, "1"]],
                    }
                ],
            },
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            result = await client.query_range("up", start=1000.0, end=2000.0, step="1m")

        assert result["status"] == "success"
        assert result["data"]["resultType"] == "matrix"

    async def test_query_range_with_custom_step(self):
        """Range query should accept custom step."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {"resultType": "matrix", "result": []},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(
            client.client, "get", return_value=mock_response
        ) as mock_get:
            await client.query_range("up", start=1000.0, end=2000.0, step="5m")

        # Verify step was passed correctly
        call_args = mock_get.call_args
        assert call_args[1]["params"]["step"] == "5m"

    async def test_query_range_error(self):
        """Range query should handle errors gracefully."""
        client = PrometheusClient("http://localhost:9090")

        with patch.object(
            client.client, "get", side_effect=httpx.ConnectError("Connection refused")
        ):
            result = await client.query_range("up", start=1000.0, end=2000.0)

        assert result["status"] == "error"
        assert "error" in result

    async def test_query_range_updates_latency(self):
        """Range query should track latency."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "success",
            "data": {"resultType": "matrix", "result": []},
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query_range("up", start=1000.0, end=2000.0)

        assert client._last_latency_ms is not None
        assert len(client._latency_samples) > 0


@pytest.mark.asyncio
class TestPing:
    """Test PrometheusClient.ping() method."""

    async def test_ping_executes_query(self):
        """Ping should execute a test query."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(
            client.client, "get", return_value=mock_response
        ) as mock_get:
            await client.ping()

        mock_get.assert_called_once()

    async def test_ping_updates_latency(self):
        """Ping should update latency stats."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.ping()

        assert client._last_latency_ms is not None


class TestGetLatencyStats:
    """Test PrometheusClient.get_latency_stats() method."""

    def test_latency_stats_empty(self):
        """Stats should show None when no queries executed."""
        client = PrometheusClient("http://localhost:9090")
        stats = client.get_latency_stats()
        assert stats["last_ms"] is None
        assert stats["avg_ms"] is None
        assert stats["last_ts"] is None

    @pytest.mark.asyncio
    async def test_latency_stats_after_query(self):
        """Stats should show values after queries."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("up")

        stats = client.get_latency_stats()
        assert stats["last_ms"] is not None
        assert stats["avg_ms"] is not None
        assert stats["last_ts"] is not None

    def test_latency_stats_average_calculation(self):
        """Stats should calculate correct average."""
        client = PrometheusClient("http://localhost:9090")
        client._latency_samples.extend([10.0, 20.0, 30.0])
        client._last_latency_ms = 30.0
        client._last_query_ts = time.time() * 1000.0

        stats = client.get_latency_stats()
        assert stats["avg_ms"] == 20.0


class TestRecordPlannerBatch:
    """Test PrometheusClient.record_planner_batch() method."""

    def test_record_planner_batch(self):
        """record_planner_batch should store batch info."""
        client = PrometheusClient("http://localhost:9090")
        client.record_planner_batch(
            total_ids=100, query_count=5, max_ids_per_query=20
        )

        assert client._last_batch["total_ids"] == 100
        assert client._last_batch["query_count"] == 5
        assert client._last_batch["max_ids_per_query"] == 20
        assert "ts" in client._last_batch

    def test_record_planner_batch_with_debug(self):
        """record_planner_batch with debug should log."""
        client = PrometheusClient("http://localhost:9090")
        client._debug_stats = True

        # Should not raise, logging is optional
        client.record_planner_batch(
            total_ids=100, query_count=5, max_ids_per_query=20
        )
        assert client._last_batch["total_ids"] == 100


class TestGetTelemetryStats:
    """Test PrometheusClient.get_telemetry_stats() method."""

    def test_get_telemetry_stats_initial(self):
        """Initial stats should show zero counts."""
        client = PrometheusClient("http://localhost:9090")
        stats = client.get_telemetry_stats()

        assert stats["query_count"] == 0
        assert stats["cache_hits"] == 0
        assert stats["cache_misses"] == 0
        assert stats["in_flight"] == 0
        assert stats["last_batch"] is None

    @pytest.mark.asyncio
    async def test_get_telemetry_stats_after_queries(self):
        """Stats should reflect query activity."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("up")
            await client.query("up")  # cache hit

        stats = client.get_telemetry_stats()
        assert stats["query_count"] >= 1
        assert stats["cache_hits"] >= 1
        assert stats["cache_misses"] >= 1

    def test_get_telemetry_stats_with_batch(self):
        """Stats should include batch info when recorded."""
        client = PrometheusClient("http://localhost:9090")
        client.record_planner_batch(total_ids=50, query_count=3, max_ids_per_query=20)

        stats = client.get_telemetry_stats()
        assert stats["last_batch"] is not None
        assert stats["last_batch"]["total_ids"] == 50

    def test_get_telemetry_stats_avg_latency(self):
        """Stats should calculate average latency correctly."""
        client = PrometheusClient("http://localhost:9090")
        client._latency_samples.extend([10.0, 20.0, 30.0])
        client._last_latency_ms = 30.0

        stats = client.get_telemetry_stats()
        assert stats["avg_ms"] == 20.0
        assert stats["last_ms"] == 30.0


class TestCacheManagement:
    """Test cache behavior and management."""

    @pytest.mark.asyncio
    async def test_separate_caches(self):
        """Health, metrics, and generic caches should be independent."""
        client = PrometheusClient("http://localhost:9090")

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("health_query", cache_type="health")
            await client.query("metrics_query", cache_type="metrics")
            await client.query("generic_query")

        assert "health_query" in client._health_cache
        assert "metrics_query" in client._metrics_cache
        assert "generic_query" in client._cache

        # Should not cross-contaminate
        assert "health_query" not in client._metrics_cache
        assert "metrics_query" not in client._health_cache

    @pytest.mark.asyncio
    async def test_cache_ttl_respected(self):
        """Different caches should respect their own TTLs."""
        client = PrometheusClient("http://localhost:9090")
        client.health_checks_ttl = 10.0
        client.metrics_ttl = 20.0
        client.cache_ttl = 15.0

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"result": []}}
        mock_response.raise_for_status = MagicMock()

        with patch.object(client.client, "get", return_value=mock_response):
            await client.query("q1", cache_type="health")
            await client.query("q2", cache_type="metrics")

        # Both should be cached
        assert "q1" in client._health_cache
        assert "q2" in client._metrics_cache
