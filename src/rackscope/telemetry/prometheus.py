from __future__ import annotations

import os
import time
import asyncio
import httpx
from collections import deque
from typing import Dict, Any, List, Tuple, Optional

# Default to internal docker network hostname if not set
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
PROMETHEUS_CACHE_TTL = float(os.getenv("PROMETHEUS_CACHE_TTL", "60"))

class PrometheusClient:
    def __init__(self, base_url: str = PROMETHEUS_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=2.0)
        self.cache_ttl = PROMETHEUS_CACHE_TTL
        self._cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._in_flight: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._latency_samples: deque[float] = deque(maxlen=20)
        self._last_latency_ms: float | None = None
        self._last_query_ts: float | None = None
        self._auth: Optional[httpx.BasicAuth] = None
        self._verify: bool | str = True
        self._cert: Optional[tuple[str, str] | str] = None

    def configure(
        self,
        base_url: str,
        cache_ttl: float,
        auth: Optional[httpx.BasicAuth],
        verify: bool | str,
        cert: Optional[tuple[str, str] | str],
        latency_window: int,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.cache_ttl = cache_ttl
        self._auth = auth
        self._verify = verify
        self._cert = cert
        if latency_window >= 1:
            self._latency_samples = deque(list(self._latency_samples), maxlen=latency_window)
        old_client = self.client
        self.client = httpx.AsyncClient(timeout=2.0, auth=self._auth, verify=self._verify, cert=self._cert)
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(old_client.aclose())
        else:
            loop.create_task(old_client.aclose())

    async def query(self, query: str) -> Dict[str, Any]:
        """Execute a PromQL instant query with simple TTL caching."""
        now = time.monotonic()
        async with self._lock:
            cached = self._cache.get(query)
            if cached and (now - cached[0]) < self.cache_ttl:
                return cached[1]
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
                    self._cache[query] = (time.monotonic(), result)
            return result

        return {"status": "error", "error": "query scheduling failed"}

    async def _fetch_query(self, query: str) -> Dict[str, Any]:
        """Execute a PromQL instant query."""
        start = time.perf_counter()
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/query",
                params={"query": query}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Prometheus query error: {e}")
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

    async def get_node_metrics(self, rack_id: str) -> Dict[str, Any]:
        """Fetch metrics for all nodes in a specific rack."""
        # We fetch temperature for all nodes in this rack
        q_temp = f'node_temperature_celsius{{rack_id="{rack_id}"}}'
        q_power = f'node_power_watts{{rack_id="{rack_id}"}}'
        
        # Parallel fetch
        results = {}
        try:
            # Note: httpx usage here should be optimized with gather in real prod
            res_temp = await self.query(q_temp)
            res_power = await self.query(q_power)
            
            # Parse Temperatures
            if res_temp.get("status") == "success":
                for item in res_temp["data"]["result"]:
                    node_id = item["metric"].get("node_id")
                    val = float(item["value"][1])
                    if node_id:
                        if node_id not in results: results[node_id] = {}
                        results[node_id]["temperature"] = val

            # Parse Power
            if res_power.get("status") == "success":
                for item in res_power["data"]["result"]:
                    node_id = item["metric"].get("node_id")
                    val = float(item["value"][1])
                    if node_id:
                        if node_id not in results: results[node_id] = {}
                        results[node_id]["power"] = val
                        
        except Exception as e:
            print(f"Error fetching node metrics: {e}")
            
        return results

    async def get_rack_health_summary(self) -> Dict[str, str]:
        """Get aggregated health status per rack based on nodes."""
        # If any node is > 35°C, rack is CRIT. If > 30°C, WARN.
        # We do this aggregation in PromQL for efficiency.
        
        # Count critical nodes per rack
        q_crit = 'count(node_temperature_celsius > 35) by (rack_id)'
        q_warn = 'count(node_temperature_celsius > 30) by (rack_id)'
        
        health_map = {}
        
        # Initialize default OK (we assume all known racks are OK unless proven otherwise)
        # In a real app we'd merge with topology list
        
        res_crit = await self.query(q_crit)
        res_warn = await self.query(q_warn)
        
        if res_warn.get("status") == "success":
            for item in res_warn["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                if rack_id: health_map[rack_id] = "WARN"

        if res_crit.get("status") == "success":
            for item in res_crit["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                if rack_id: health_map[rack_id] = "CRIT"
                
        return health_map

# Global instance
client = PrometheusClient()
