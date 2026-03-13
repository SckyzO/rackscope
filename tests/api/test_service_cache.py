"""
Tests for ServiceCache — response-level cache above TelemetryPlanner.

Tests hit/miss/TTL expiry/prefix invalidation/stats/concurrency.
"""

import asyncio

import pytest

from rackscope.api.cache import ServiceCache


@pytest.fixture
def cache() -> ServiceCache:
    return ServiceCache()


# ── Basic get/set ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_miss_returns_none(cache: ServiceCache):
    result = await cache.get("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_set_then_get(cache: ServiceCache):
    await cache.set("key1", {"value": 42}, ttl=60.0)
    result = await cache.get("key1")
    assert result == {"value": 42}


@pytest.mark.asyncio
async def test_overwrite_key(cache: ServiceCache):
    await cache.set("key1", "first", ttl=60.0)
    await cache.set("key1", "second", ttl=60.0)
    assert await cache.get("key1") == "second"


# ── TTL expiry ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_expired_entry_returns_none(cache: ServiceCache):
    await cache.set("key-ttl", "fresh", ttl=0.01)  # 10ms TTL
    await asyncio.sleep(0.05)                        # wait 50ms
    result = await cache.get("key-ttl")
    assert result is None


@pytest.mark.asyncio
async def test_not_yet_expired(cache: ServiceCache):
    await cache.set("key-ttl2", "fresh", ttl=60.0)
    await asyncio.sleep(0.01)
    assert await cache.get("key-ttl2") == "fresh"


# ── Invalidation ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invalidate_prefix(cache: ServiceCache):
    await cache.set("rack:r01:state", "data1", ttl=60.0)
    await cache.set("rack:r02:state", "data2", ttl=60.0)
    await cache.set("room:room1:state", "data3", ttl=60.0)

    count = await cache.invalidate_prefix("rack:")
    assert count == 2
    assert await cache.get("rack:r01:state") is None
    assert await cache.get("rack:r02:state") is None
    assert await cache.get("room:room1:state") == "data3"  # untouched


@pytest.mark.asyncio
async def test_invalidate_all(cache: ServiceCache):
    await cache.set("rack:r01:state", "a", ttl=60.0)
    await cache.set("room:r1:state", "b", ttl=60.0)
    await cache.set("stats:global", "c", ttl=60.0)

    await cache.invalidate_all()

    assert await cache.get("rack:r01:state") is None
    assert await cache.get("room:r1:state") is None
    assert await cache.get("stats:global") is None


@pytest.mark.asyncio
async def test_invalidate_prefix_empty_match(cache: ServiceCache):
    await cache.set("rack:r01:state", "data", ttl=60.0)
    count = await cache.invalidate_prefix("device:")
    assert count == 0
    assert await cache.get("rack:r01:state") == "data"


# ── Stats ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_stats_initial(cache: ServiceCache):
    s = cache.stats()
    assert s["size"] == 0
    assert s["hits"] == 0
    assert s["misses"] == 0


@pytest.mark.asyncio
async def test_stats_hit_miss_count(cache: ServiceCache):
    await cache.get("miss1")
    await cache.get("miss2")
    await cache.set("hit1", "v", ttl=60.0)
    await cache.get("hit1")
    await cache.get("hit1")

    s = cache.stats()
    assert s["hits"] == 2
    assert s["misses"] == 2
    assert s["hit_rate"] == 0.5


@pytest.mark.asyncio
async def test_stats_size(cache: ServiceCache):
    await cache.set("k1", 1, ttl=60.0)
    await cache.set("k2", 2, ttl=60.0)
    assert cache.stats()["size"] == 2
    await cache.invalidate_all()
    assert cache.stats()["size"] == 0


@pytest.mark.asyncio
async def test_stats_active_vs_expired(cache: ServiceCache):
    await cache.set("live", "v", ttl=60.0)
    await cache.set("dead", "v", ttl=0.01)
    await asyncio.sleep(0.05)

    s = cache.stats()
    # "dead" is still in store until next get cleans it, but "active" count excludes it
    assert s["active"] == 1


# ── Concurrency ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_concurrent_set_get(cache: ServiceCache):
    """Multiple coroutines writing/reading must not corrupt the cache."""
    async def writer(i: int) -> None:
        await cache.set(f"key-{i}", i, ttl=60.0)

    async def reader(i: int) -> None:
        await cache.get(f"key-{i}")

    await asyncio.gather(*[writer(i) for i in range(100)])
    await asyncio.gather(*[reader(i) for i in range(100)])

    for i in range(100):
        assert await cache.get(f"key-{i}") == i


@pytest.mark.asyncio
async def test_concurrent_invalidate(cache: ServiceCache):
    """Concurrent invalidate_all must not raise."""
    for i in range(50):
        await cache.set(f"k{i}", i, ttl=60.0)

    await asyncio.gather(*[cache.invalidate_all() for _ in range(10)])
    assert cache.stats()["size"] == 0


# ── Cache key patterns ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_rack_cache_key_with_metrics(cache: ServiceCache):
    """Rack state and rack state+metrics are stored under different keys."""
    await cache.set("rack:r01:state", {"state": "OK"}, ttl=5.0)
    await cache.set("rack:r01:state:metrics", {"state": "OK", "metrics": {}}, ttl=120.0)

    assert await cache.get("rack:r01:state") == {"state": "OK"}
    assert await cache.get("rack:r01:state:metrics") != await cache.get("rack:r01:state")


@pytest.mark.asyncio
async def test_none_value_stored(cache: ServiceCache):
    """Storing None is valid (avoids re-fetching None responses)."""
    await cache.set("empty-key", None, ttl=5.0)
    # None stored — but get() returns None for both miss AND None-value.
    # This is acceptable: worst case is one extra recompute for None responses.
    # The cache treats None as "not cached" to keep the interface simple.
    result = await cache.get("empty-key")
    assert result is None  # None value is treated as miss (by design)


# ── Edge cases added from coverage audit ─────────────────────────────────────


@pytest.mark.asyncio
async def test_stats_zero_accesses_hit_rate(cache: ServiceCache):
    """hit_rate is 0.0 (not error) when no accesses yet."""
    s = cache.stats()
    assert s["hits"] == 0
    assert s["misses"] == 0
    assert s["hit_rate"] == 0.0  # max(1, 0+0) guards against div/0


@pytest.mark.asyncio
async def test_none_stored_is_hit_returning_none(cache: ServiceCache):
    """None stored IS a cache hit — get() returns None, caller cannot distinguish from miss.

    Design decision: the cache transparently stores None.
    Callers that need to distinguish must use a sentinel value.
    """
    await cache.set("key", None, ttl=60.0)
    result = await cache.get("key")  # HIT — returns None from stored value
    assert result is None
    s = cache.stats()
    assert s["hits"] == 1     # counted as hit (entry exists and is not expired)
    assert s["misses"] == 0


@pytest.mark.asyncio
async def test_invalidate_prefix_empty_string_clears_all(cache: ServiceCache):
    """Empty prefix matches every key — clears entire cache."""
    await cache.set("rack:r1", "a", ttl=60.0)
    await cache.set("room:r1", "b", ttl=60.0)
    await cache.set("stats:global", "c", ttl=60.0)

    count = await cache.invalidate_prefix("")
    assert count == 3
    assert cache.stats()["size"] == 0


@pytest.mark.asyncio
async def test_invalidate_prefix_partial_overlap(cache: ServiceCache):
    """Prefix invalidation is startswith — partial overlap included."""
    await cache.set("rack:r01:state", "a", ttl=60.0)
    await cache.set("rack:r02:state", "b", ttl=60.0)
    await cache.set("ra_other:key", "c", ttl=60.0)   # starts with "ra"
    await cache.set("room:r01:state", "d", ttl=60.0)  # starts with "room"

    count = await cache.invalidate_prefix("ra")
    assert count == 3  # "rack:r01", "rack:r02", "ra_other" all start with "ra"
    assert await cache.get("room:r01:state") == "d"   # untouched
