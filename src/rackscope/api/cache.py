"""
Service Cache

Response-level cache sitting above the TelemetryPlanner.
Caches fully assembled JSON responses so cache hits skip all computation.

Cache hierarchy:
  ServiceCache (this, 5s)          ← response JSON, per endpoint
    TelemetryPlanner snapshot (60s) ← all node/rack states
      PrometheusClient TTL cache (60/120s) ← raw PromQL results
        Prometheus HTTP
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class _Entry:
    value: Any
    expires_at: float  # monotonic timestamp


class ServiceCache:
    """Thread-safe in-memory response cache with TTL and prefix invalidation.

    Usage:
        cached = await cache.get("rack:rack-01:state")
        if cached is None:
            result = await compute_expensive_thing()
            await cache.set("rack:rack-01:state", result, ttl=5.0)

    Invalidation:
        await cache.invalidate_prefix("rack:")     # all rack endpoints
        await cache.invalidate_all()               # on topology reload
    """

    def __init__(self) -> None:
        self._store: dict[str, _Entry] = {}
        self._lock: asyncio.Lock = asyncio.Lock()
        self._hits: int = 0
        self._misses: int = 0

    async def get(self, key: str) -> Optional[Any]:
        """Return cached value if present and not expired, else None."""
        async with self._lock:
            entry = self._store.get(key)
            if entry is not None and time.monotonic() < entry.expires_at:
                self._hits += 1
                return entry.value
            if entry is not None:
                # Expired — remove eagerly
                del self._store[key]
            self._misses += 1
            return None

    async def set(self, key: str, value: Any, ttl: float) -> None:
        """Store value with TTL in seconds."""
        async with self._lock:
            self._store[key] = _Entry(value=value, expires_at=time.monotonic() + ttl)

    async def invalidate_prefix(self, prefix: str) -> int:
        """Delete all entries whose key starts with prefix. Returns count deleted."""
        async with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            return len(keys)

    async def invalidate_all(self) -> None:
        """Clear the entire cache — call on topology/config reload."""
        async with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        """Return cache statistics (no lock — approximate read)."""
        now = time.monotonic()
        active = sum(1 for e in self._store.values() if e.expires_at > now)
        return {
            "size": len(self._store),
            "active": active,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / max(1, self._hits + self._misses), 3),
        }
