"""
Service Cache

Response-level cache sitting above the TelemetryPlanner.
Caches fully assembled JSON responses so cache hits skip all computation.

Cache hierarchy:
  ServiceCache (this, 5s)          ← response JSON, per endpoint
    TelemetryPlanner snapshot (60s) ← all node/rack states
      PrometheusClient TTL cache (60/120s) ← raw PromQL results
        Prometheus HTTP

Singleflight deduplication
--------------------------
When a cache entry expires, multiple concurrent requests would normally all
miss and trigger the same expensive computation (stampede). ServiceCache
prevents this with a per-key Future (_inflight dict):

  1. First miss on key K → caller is the "leader": _inflight[K] is created,
     get() returns None so the leader computes the result.
  2. Subsequent misses on K while the leader is computing → callers are
     "followers": get() awaits the inflight Future and returns the leader's
     result when it is ready. Followers never reach the compute path.
  3. Leader calls set() → value is stored AND the Future is resolved,
     unblocking all followers.
  4. Leader exception → caller must call cancel_inflight(K) so followers
     receive None (retry semantics) instead of waiting forever.

Usage pattern (call sites):

    cached = await cache.get(key)
    if cached is not None:
        return cached          # hit or follower — both return here

    try:
        result = await expensive_computation()
        await cache.set(key, result, ttl=ttl)
        return result
    except Exception:
        await cache.cancel_inflight(key)
        raise
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
    """Thread-safe in-memory response cache with TTL, prefix invalidation,
    and singleflight deduplication (prevents cache stampede on TTL expiry).

    Invalidation:
        await cache.invalidate_prefix("rack:")     # all rack endpoints
        await cache.invalidate_all()               # on topology reload
    """

    def __init__(self) -> None:
        self._store: dict[str, _Entry] = {}
        self._lock: asyncio.Lock = asyncio.Lock()
        self._inflight: dict[str, asyncio.Future] = {}  # per-key singleflight futures
        self._hits: int = 0
        self._misses: int = 0

    async def get(self, key: str) -> Optional[Any]:
        """Return cached value (hit), wait for in-flight result (follower), or None (leader).

        On a cache miss this method checks whether another coroutine is already
        computing the value for this key:

        - **Hit**: returns the cached value immediately.
        - **Leader** (first miss, no in-flight): registers a Future in _inflight
          and returns None — the caller must compute and call set().
        - **Follower** (miss while leader is computing): awaits the leader's
          Future and returns the result once it is available.

        Callers cannot distinguish hit from follower — both receive a non-None
        value and return it. Only the leader receives None and must compute.
        """
        async with self._lock:
            entry = self._store.get(key)
            if entry is not None and time.monotonic() < entry.expires_at:
                self._hits += 1
                return entry.value
            if entry is not None:
                del self._store[key]

            self._misses += 1
            if key in self._inflight:
                fut = self._inflight[key]
                # follower — must await outside lock to avoid deadlock
            else:
                # leader — register placeholder future and let caller compute
                self._inflight[key] = asyncio.get_running_loop().create_future()
                return None

        # follower path — wait for leader's result outside lock
        result = await asyncio.shield(fut)
        # shield re-raises CancelledError if fut was cancelled (cancel_inflight)
        return result

    async def set(self, key: str, value: Any, ttl: float) -> None:
        """Store value with TTL and unblock any followers waiting on this key."""
        async with self._lock:
            self._store[key] = _Entry(value=value, expires_at=time.monotonic() + ttl)
            fut = self._inflight.pop(key, None)
        if fut is not None and not fut.done():
            fut.set_result(value)

    async def cancel_inflight(self, key: str) -> None:
        """Unblock followers when the leader's computation failed.

        Resolves the in-flight Future with None so followers receive None and
        become new leaders (retry semantics). Call this in the except/finally
        block of the compute section when an exception is raised before set().
        """
        async with self._lock:
            fut = self._inflight.pop(key, None)
        if fut is not None and not fut.done():
            fut.set_result(None)

    async def invalidate_prefix(self, prefix: str) -> int:
        """Delete all entries whose key starts with prefix. Returns count deleted."""
        async with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            return len(keys)

    async def invalidate_all(self) -> None:
        """Clear the entire cache and unblock any in-flight followers.

        Called on topology/config reload. In-flight futures are resolved with
        None so followers retry with the freshly loaded state.
        """
        async with self._lock:
            self._store.clear()
            futs = list(self._inflight.values())
            self._inflight.clear()
        for fut in futs:
            if not fut.done():
                fut.set_result(None)

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
            "inflight": len(self._inflight),
        }
