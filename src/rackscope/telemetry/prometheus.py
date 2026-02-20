from __future__ import annotations

import os
import time
import asyncio
import logging
import httpx
from collections import deque
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

# Default to internal docker network hostname if not set
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
PROMETHEUS_CACHE_TTL = float(os.getenv("PROMETHEUS_CACHE_TTL", "60"))


class PrometheusClient:
    def __init__(self, base_url: str = PROMETHEUS_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=2.0)
        self.cache_ttl = PROMETHEUS_CACHE_TTL  # Deprecated, kept for backward compatibility
        self.health_checks_ttl = 30.0  # TTL for health checks (default 30s)
        self.metrics_ttl = 120.0  # TTL for detailed metrics (default 120s)
        self._health_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}  # Cache for health checks
        self._metrics_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}  # Cache for metrics
        self._cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}  # Generic cache (backward compat)
        self._in_flight: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._latency_samples: deque[float] = deque(maxlen=20)
        self._last_latency_ms: float | None = None
        self._last_query_ts: float | None = None
        self._auth: Optional[httpx.BasicAuth] = None
        self._verify: bool | str = True
        self._cert: Optional[tuple[str, str] | str] = None
        self._debug_stats: bool = False
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._query_count: int = 0
        self._last_batch: Dict[str, Any] = {}

    def configure(
        self,
        base_url: str,
        cache_ttl: float,
        auth: Optional[httpx.BasicAuth],
        verify: bool | str,
        cert: Optional[tuple[str, str] | str],
        latency_window: int,
        debug_stats: bool = False,
        health_checks_ttl: Optional[float] = None,
        metrics_ttl: Optional[float] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.cache_ttl = cache_ttl  # Backward compatibility
        self.health_checks_ttl = health_checks_ttl if health_checks_ttl is not None else cache_ttl
        self.metrics_ttl = metrics_ttl if metrics_ttl is not None else cache_ttl
        self._auth = auth
        self._verify = verify
        self._cert = cert
        self._debug_stats = debug_stats
        if latency_window >= 1:
            self._latency_samples = deque(list(self._latency_samples), maxlen=latency_window)
        old_client = self.client
        self.client = httpx.AsyncClient(
            timeout=2.0, auth=self._auth, verify=self._verify, cert=self._cert
        )
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(old_client.aclose())
        else:
            loop.create_task(old_client.aclose())

    async def query(self, query: str, cache_type: Optional[str] = None) -> Dict[str, Any]:
        """Execute a PromQL instant query with TTL caching.

        Args:
            query: PromQL query string
            cache_type: Type of cache to use ('health' for checks, 'metrics' for detailed metrics, None for generic)

        Returns:
            Query result dictionary
        """
        now = time.monotonic()

        # Select cache and TTL based on cache_type
        if cache_type == "health":
            cache = self._health_cache
            ttl = self.health_checks_ttl
        elif cache_type == "metrics":
            cache = self._metrics_cache
            ttl = self.metrics_ttl
        else:
            cache = self._cache
            ttl = self.cache_ttl

        async with self._lock:
            cached = cache.get(query)
            if cached and (now - cached[0]) < ttl:
                self._cache_hits += 1
                return cached[1]
            self._cache_misses += 1
            task = self._in_flight.get(query)
            if task is None:
                task = asyncio.create_task(self._fetch_query(query))
                self._in_flight[query] = task

        if task is not None:
            result = await task
            async with self._lock:
                if self._in_flight.get(query) is task:
                    self._in_flight.pop(query, None)
                if result.get("status") == "success":
                    cache[query] = (time.monotonic(), result)
            return result

        return {"status": "error", "error": "query scheduling failed"}

    async def _fetch_query(self, query: str) -> Dict[str, Any]:
        """Execute a PromQL instant query."""
        start = time.perf_counter()
        try:
            self._query_count += 1
            response = await self.client.get(
                f"{self.base_url}/api/v1/query", params={"query": query}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Prometheus query error: {e}")
            return {"status": "error", "error": str(e)}
        finally:
            duration_ms = (time.perf_counter() - start) * 1000.0
            self._last_latency_ms = duration_ms
            self._last_query_ts = time.time() * 1000.0
            self._latency_samples.append(duration_ms)

    async def ping(self) -> None:
        """Force a Prometheus call to refresh latency stats."""
        await self._fetch_query("vector(1)")

    def get_latency_stats(self) -> Dict[str, Any]:
        if not self._latency_samples:
            return {"last_ms": None, "avg_ms": None, "last_ts": None}
        avg_ms = sum(self._latency_samples) / len(self._latency_samples)
        return {
            "last_ms": self._last_latency_ms,
            "avg_ms": avg_ms,
            "last_ts": self._last_query_ts,
        }

    def record_planner_batch(
        self, total_ids: int, query_count: int, max_ids_per_query: int
    ) -> None:
        self._last_batch = {
            "total_ids": total_ids,
            "query_count": query_count,
            "max_ids_per_query": max_ids_per_query,
            "ts": time.time() * 1000.0,
        }
        if self._debug_stats:
            logger.debug(
                "Telemetry batch: ids=%s queries=%s max_ids=%s",
                total_ids,
                query_count,
                max_ids_per_query,
            )

    def get_telemetry_stats(self) -> Dict[str, Any]:
        return {
            "query_count": self._query_count,
            "cache_hits": self._cache_hits,
            "cache_misses": self._cache_misses,
            "in_flight": len(self._in_flight),
            "last_batch": self._last_batch or None,
            "last_ms": self._last_latency_ms,
            "avg_ms": (sum(self._latency_samples) / len(self._latency_samples))
            if self._latency_samples
            else None,
            "last_ts": self._last_query_ts,
        }


# Global instance
client = PrometheusClient()
