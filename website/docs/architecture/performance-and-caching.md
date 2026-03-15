---
id: performance-and-caching
title: Performance & Caching
sidebar_position: 3
---

# Performance & Caching

Rackscope is designed to serve live Prometheus data to multiple concurrent NOC operators without hammering Prometheus on every page load or auto-refresh tick. It achieves this through a four-layer cache architecture that separates concerns by granularity, combined with a topology index that eliminates nested-loop traversals across all request paths.

---

## 1. Overview — Four-Layer Cache Architecture

```
Browser (React + localStorage)
│
│  fetchWithCache — 5s TTL per endpoint, stale-on-error fallback
│
├── GET /api/rooms/{id}/state
├── GET /api/racks/{id}/state
├── GET /api/stats/telemetry
└── ...
         │
         ▼
FastAPI backend (Python / asyncio)
│
│  ServiceCache — 5s TTL, response-level, per cache key
│  (src/rackscope/api/cache.py)
│
│  Cache key examples:
│    "room:salle-a:state"
│    "rack:rack-42:state"
│    "stats:global"
         │
         ▼
TelemetryPlanner snapshot — 60s TTL, asyncio.Lock
│  (src/rackscope/telemetry/planner.py)
│
│  One PlannerSnapshot covers ALL topology nodes/racks.
│  Concurrent requests share the same recomputation.
         │
         ▼
PrometheusClient — 3 independent TTL caches + in-flight dedup
│  (src/rackscope/telemetry/prometheus.py)
│
│  health cache  — 60s TTL  (health check PromQL queries)
│  metrics cache — 120s TTL (detailed metric queries)
│  generic cache — 60s TTL  (backward-compat / other queries)
│
│  In-flight dedup: concurrent queries for the same PromQL
│  expression share one HTTP request.
         │
         ▼
Prometheus HTTP  /api/v1/query
```

Each layer has a distinct purpose:

| Layer | Location | TTL | Purpose |
|---|---|---|---|
| `fetchWithCache` | Browser localStorage | 5s (configurable) | Absorbs rapid UI re-renders, survives network errors |
| `ServiceCache` | Backend RAM | 5s (configurable) | Skips all Python computation on repeated identical requests |
| `TelemetryPlanner` | Backend RAM | 60s | Batches PromQL, deduplicates concurrent refreshes |
| `PrometheusClient` | Backend RAM | 60–120s | Caches raw PromQL results, prevents in-flight duplicates |

Together, a wall of NOC screens all refreshing the same room page every 5 seconds results in at most one Prometheus query batch per 60 seconds.

---

## 2. Layer 1 — Frontend `fetchWithCache`

**File**: `frontend/src/services/api.ts`

Every GET call in the API client goes through `fetchWithCache`. It stores responses in `localStorage` under the `rackscope.cache.*` namespace.

### Behaviour

```
Request arrives
     │
     ▼
Check localStorage for fresh entry (age < ttl)
     │
     ├─ HIT (fresh) → return cached value immediately
     │
     └─ MISS → call backend
                    │
                    ├─ Success → write to localStorage, return data
                    │
                    └─ Failure → return stale localStorage value if any
                                 (stale-on-error)
                                 otherwise throw
```

Errors are logged to `rackscope.client.errors` (last 50 entries) for the status panel.

### TTL values

The default stale threshold is `2 * 60 * 1000` ms (2 minutes), but hot endpoints pass explicit short TTLs:

```typescript
// Room state — polled every few seconds by RoomPage
fetchWithCache(`/api/rooms/${roomId}/state`, `room.${roomId}.state`, 5000);

// Rack state (health-only) — polled by rack detail views
fetchWithCache(url, cacheKey, 5000);

// Device metrics — heavier, refreshed less often
fetchWithCache(url, cacheKey, 60000);

// All room states at once (DashboardPage)
fetchWithCache('/api/rooms/states', 'rooms.all-states', 15_000);
```

### Cache key convention

Cache keys follow the pattern `<domain>.<id>.<variant>`, e.g.:

- `room.salle-a.state`
- `rack.rack-42.state`
- `rack.rack-42.state.metrics`
- `device.rack-42.chassis-01.metrics`

### Cache invalidation on mutations

Write operations (POST/PUT/DELETE) call `writeCache(key, null)` immediately after success to force a fresh fetch on the next read:

```typescript
// After adding a device to rack-42:
writeCache('rooms', null);
writeCache(`rack.rack-42`, null);
```

### Stale-on-error

If the backend is unreachable or returns an HTTP error, `fetchWithCache` returns the last stored value rather than propagating the error. The UI continues to show the last known state, and the status panel surfaces the failure via the error log. This is intentional for NOC environments where a brief backend restart must not wipe all displayed data.

---

## 3. Layer 2 — `ServiceCache`

**File**: `src/rackscope/api/cache.py`

`ServiceCache` is a response-level in-memory cache sitting directly above the TelemetryPlanner. A cache hit returns the fully assembled JSON dict from the previous computation, skipping all Python work: snapshot access, rack-state aggregation, response model building.

### Class summary

```python
class ServiceCache:
    _store: dict[str, _Entry]   # key → { value, expires_at }
    _lock: asyncio.Lock          # protects _store from concurrent access
    _hits: int
    _misses: int
```

### Usage pattern in routers

All endpoints that sit above the planner follow the same pattern:

```python
_cache_key = f"room:{room_id}:state"
_ttl = float(app_config.cache.service_ttl_seconds) if app_config else 5.0

cached = await svc_cache.get(_cache_key)
if cached is not None:
    return cached          # O(1) — no computation, no Prometheus call

result = await compute_result(...)
await svc_cache.set(_cache_key, result, ttl=_ttl)
return result
```

### Key naming convention

| Endpoint | Cache key |
|---|---|
| `GET /api/rooms/{id}/state` | `room:{id}:state` |
| `GET /api/racks/{id}/state` | `rack:{id}:state` |
| `GET /api/racks/{id}/state?include_metrics=true` | `rack:{id}:state:metrics` |
| `GET /api/stats/global` | `stats:global` |
| `GET /api/rooms/states` | `rooms:all-states` |

### Prefix invalidation

When a mutation endpoint modifies topology or config, it invalidates related ServiceCache entries by prefix:

```python
# Invalidate all rack entries (e.g. after topology reload)
await svc_cache.invalidate_prefix("rack:")

# Invalidate everything (e.g. full config reload)
await svc_cache.invalidate_all()
```

The `invalidate_all()` call is triggered in `api/app.py` at the end of any `apply_config()` path (topology reload, config save, etc.).

### TTL configuration

`service_ttl_seconds` is read from `app.yaml`:

```yaml
cache:
  service_ttl_seconds: 5
```

The default is 5 seconds. Raising it to 15–30 seconds is safe for read-heavy NOC deployments where operators are watching (not editing). Keep it at 5 seconds if the Settings UI or Topology Editor is actively used.

### Stats

`ServiceCache` exposes a `stats()` method (no lock — approximate):

```python
{
    "size": 12,         # total entries in store (including expired)
    "active": 8,        # entries not yet expired
    "hits": 4820,
    "misses": 320,
    "hit_rate": 0.938
}
```

This is surfaced under `/api/stats/telemetry` as `service_cache`.

---

## 4. Layer 3 — `TelemetryPlanner` Snapshot

**File**: `src/rackscope/telemetry/planner.py`

The `TelemetryPlanner` is the most important performance component. Without it, a 500-rack deployment would fire one PromQL query per device per endpoint call — thousands of HTTP requests per refresh cycle.

### What the planner does

1. Collects all node IDs, chassis IDs, and rack IDs from the full topology in a single pass.
2. Builds regex-encoded batched PromQL expressions that cover all IDs in one query per check.
3. Runs all check queries against Prometheus concurrently.
4. Aggregates results into a `PlannerSnapshot` covering every node, chassis, and rack state.
5. Caches the snapshot for `cache_ttl_seconds` (default: 60s).

### Batching

The planner replaces four PromQL placeholders:

| Placeholder | Replaced with |
|---|---|
| `$instances` | Regex of all node instance IDs |
| `$chassis` | Regex of all chassis/device IDs |
| `$racks` | Regex of all rack IDs |
| `$jobs` | `job_regex` pattern from config |

Example transformation for 200 nodes with `max_ids_per_query: 50`:

```
# Check expr:
up{instance=~"$instances", job=~"$jobs"}

# Becomes 4 queries, each covering 50 nodes:
up{instance=~"^(?:compute0[0-4][0-9])$", job=~".*"}
up{instance=~"^(?:compute0[5-9][0-9])$", job=~".*"}
...
```

The regex is built using a trie compressor (`_build_trie` + `_trie_to_regex`) that produces compact patterns like `compute[0-9][0-9][0-9]` rather than `compute001|compute002|...`.

### asyncio.Lock prevents thundering herd

```python
async def get_snapshot(...) -> PlannerSnapshot:
    now = time.monotonic()
    if self._snapshot and (now - self._snapshot.generated_at) < self.config.cache_ttl_seconds:
        return self._snapshot          # Fast path — no lock needed

    async with self._refresh_lock:
        # Re-check inside lock: another coroutine may have finished
        # recomputing while we were waiting.
        now = time.monotonic()
        if self._snapshot and (now - self._snapshot.generated_at) < ...:
            return self._snapshot      # Already recomputed by a peer

        return await self._recompute(...)
```

If 10 concurrent requests all arrive with a stale snapshot, exactly one triggers a recomputation. The other 9 block on the lock, then receive the freshly computed snapshot without each launching their own full Prometheus query batch.

### PlannerSnapshot structure

```python
@dataclass
class PlannerSnapshot:
    generated_at: float
    node_states:    Dict[str, str]              # instance_id → severity
    chassis_states: Dict[str, str]              # device_id → severity
    rack_states:    Dict[str, str]              # rack_id → severity
    rack_nodes:     Dict[str, List[str]]        # rack_id → [instance_ids]
    node_checks:    Dict[str, Dict[str, str]]   # instance_id → {check_id: severity}
    chassis_checks: Dict[str, Dict[str, str]]
    rack_checks:    Dict[str, Dict[str, str]]
    node_alerts:    Dict[str, Dict[str, str]]   # subset: only WARN/CRIT
    chassis_alerts: Dict[str, Dict[str, str]]
    rack_alerts:    Dict[str, Dict[str, str]]
```

All individual room/rack endpoint handlers read from this shared snapshot — they do not each trigger a Prometheus query cycle.

### For-duration debounce

Checks with `for_duration` (e.g. `for_duration: "5m"`) are debounced in the planner: the first time a WARN/CRIT fires, the planner records the timestamp in `_pending_states`. The severity only propagates after the configured duration has elapsed without recovery. This prevents transient metric spikes from triggering false positives.

### TTL configuration

```yaml
planner:
  cache_ttl_seconds: 60
  max_ids_per_query: 50
  unknown_state: UNKNOWN
```

The planner recomputes at most once per `cache_ttl_seconds`, regardless of how many endpoints or concurrent users are active.

---

## 5. Layer 4 — `PrometheusClient`

**File**: `src/rackscope/telemetry/prometheus.py`

The global `client` instance (module-level singleton) wraps `httpx.AsyncClient` and adds three independent TTL caches plus in-flight deduplication.

### Three independent caches

| Cache attribute | `cache_type` argument | Default TTL | Used by |
|---|---|---|---|
| `_health_cache` | `"health"` | 60s | TelemetryPlanner (health check PromQL) |
| `_metrics_cache` | `"metrics"` | 120s | MetricsService (detailed metric queries) |
| `_cache` | `None` | 60s | Generic / backward-compat callers |

Callers select the cache by passing `cache_type` to `client.query()`:

```python
# In planner._recompute:
result = await prom_client.query(query, cache_type="health")

# In metrics_service:
result = await prom_client.query(query, cache_type="metrics")
```

### In-flight deduplication

When a cache miss occurs, the client does not immediately create a new HTTP request. Instead it checks `_in_flight` — a dict of pending `asyncio.Task` objects keyed by query string:

```
Coroutine A: cache miss → create task T, register in _in_flight["up{...}"]
Coroutine B: cache miss → _in_flight["up{...}"] already exists → await T
Coroutine C: cache miss → _in_flight["up{...}"] already exists → await T

Task T completes → all three coroutines receive the same result
```

This prevents the "thundering herd" at Prometheus on snapshot expiry, where many concurrent requests could otherwise each initiate an identical HTTP call.

### Periodic cache eviction

Every 5 minutes the client runs `_evict_expired_cache()`, which iterates all three caches and removes stale entries. This prevents unbounded memory growth for topologies with frequently changing instance sets.

### TTL configuration

Cache TTLs are set via `configure()`, called from `api/app.py` during startup:

```yaml
# In app.yaml:
telemetry:
  cache_ttl_seconds: 60           # generic + health cache (if not overridden)
  health_checks_ttl_seconds: 60   # health cache
  metrics_ttl_seconds: 120        # metrics cache
```

`health_checks_ttl_seconds` defaults to `cache_ttl_seconds` if not explicitly set. `metrics_ttl_seconds` defaults to `cache_ttl_seconds` if not set.

### Latency tracking

The client maintains a rolling deque of the last 20 query durations (configurable via `latency_window`). `get_latency_stats()` returns `last_ms`, `avg_ms`, and `last_ts`, which are exposed at `/api/stats/prometheus`.

---

## 6. TopologyIndex — O(1) Topology Lookups

**File**: `src/rackscope/model/domain.py`

### The problem

Before `TopologyIndex`, every endpoint that needed to find a rack, room, or device had to iterate the full topology tree:

```python
# Old pattern — O(n) every time
for site in topology.sites:
    for room in site.rooms:
        for aisle in room.aisles:
            for rack in aisle.racks:
                if rack.id == target_id:
                    return rack
```

For large topologies (hundreds of racks, thousands of instances), this loop ran on every request for every lookup — room state, rack state, device detail, Slurm node mapping, etc.

### The solution

`build_topology_index()` does one O(n) traversal at topology load time and populates six flat dicts:

```python
@dataclass
class TopologyIndex:
    sites:     Dict[str, Site]              # site_id → Site
    rooms:     Dict[str, Room]              # room_id → Room
    aisles:    Dict[str, Aisle]             # aisle_id → Aisle
    racks:     Dict[str, RackContext]       # rack_id → RackContext
    devices:   Dict[str, tuple]             # device_id → (Device, rack_id)
    instances: Dict[str, InstanceContext]   # instance_name → InstanceContext
```

`RackContext` carries the full location context for a rack — its parent `Site`, `Room`, and optional `aisle_id` — so callers never need to traverse up the tree to find the room a rack belongs to:

```python
@dataclass
class RackContext:
    rack:          Rack
    site:          Site
    room:          Room
    aisle_id:      Optional[str]   # None for standalone racks
    is_standalone: bool
```

`InstanceContext` similarly provides device + rack + room + site for any Prometheus instance name, enabling O(1) node-to-location resolution needed by the Slurm node list and device detail views:

```python
@dataclass
class InstanceContext:
    device: Device
    rack:   Rack
    room:   Room
    site:   Site
```

### Build lifecycle

```python
# In api/app.py — called on startup and on every topology reload:
TOPOLOGY_INDEX = build_topology_index(TOPOLOGY)
```

The index is rebuilt whenever `TOPOLOGY` is replaced (config save, YAML edit via editor, `make restart`). It is never mutated in place — a new index object is built and the reference is swapped atomically.

### Instance expansion

`_expand_instances(device)` handles all three instance formats during index build:

```python
# Pattern string:  "compute[001-004]" → ["compute001", "compute002", "compute003", "compute004"]
# List:            ["node01", "node02"] → same
# Slot map:        {1: "node01", 2: "node02"} → ["node01", "node02"]
```

Each resulting instance name gets an `InstanceContext` entry pointing back to its device, rack, room, and site.

---

## 7. Monitoring Cache Health

### `/api/stats/telemetry`

Returns a snapshot of `PrometheusClient` internals:

```json
{
  "query_count": 14820,
  "cache_hits": 13140,
  "cache_misses": 1680,
  "in_flight": 0,
  "last_batch": {
    "total_ids": 512,
    "query_count": 22,
    "max_ids_per_query": 50,
    "ts": 1741823042000.0
  },
  "last_ms": 18.4,
  "avg_ms": 21.3,
  "last_ts": 1741823042000.0
}
```

**What to look for:**

- `cache_hits / (cache_hits + cache_misses)` — expect > 90% under normal load. A ratio below 70% suggests the planner TTL is too short or there is a memory-pressure cache eviction problem.
- `in_flight` — should be 0 at rest. Persistent non-zero values indicate stuck tasks (log and investigate).
- `last_batch.query_count` — the number of PromQL queries fired on the last planner cycle. For a 500-node cluster with 10 checks and `max_ids_per_query: 50`, expect `10 × ceil(500/50) = 100` queries. If this is much higher, review `max_ids_per_query`.
- `avg_ms` — rolling average of raw Prometheus HTTP latency. Values above 200ms on a local Prometheus instance suggest Prometheus is under load or the queries are too broad.

### `/api/stats/prometheus`

Returns Prometheus client latency stats and heartbeat timing:

```json
{
  "last_ms": 18.4,
  "avg_ms": 21.3,
  "last_ts": 1741823042000.0,
  "heartbeat_seconds": 60,
  "next_ts": 1741823102000.0
}
```

### `/api/stats/global`

Returns aggregate health counts (cached by `ServiceCache` at `stats:global`):

```json
{
  "total_rooms": 4,
  "total_racks": 120,
  "active_alerts": 3,
  "crit_count": 1,
  "warn_count": 2,
  "status": "CRIT"
}
```

This endpoint itself is cached by `ServiceCache`, so the DashboardPage polling at 15s incurs at most one planner snapshot read per 5s window.

---

## 8. Tuning Guide

### Scenario: frequent alert flapping on a large cluster

**Symptom**: Nodes oscillating between OK and WARN every few refresh cycles.

**Cause**: Short health check TTL combined with transient metric spikes.

**Fix**: Add `for_duration` to the relevant check in `config/checks/library/<file>.yaml`:

```yaml
checks:
  - id: node_load_warn
    for_duration: "5m"
    ...
```

The planner's debounce logic will hold the previous state for 5 minutes before firing.

---

### Scenario: room page feels slow on a large topology

**Symptom**: Room page takes 1–2 seconds to load even on second visit.

**Cause**: `service_ttl_seconds` too low, or `ServiceCache` is being invalidated too aggressively.

**Fix**: Increase `service_ttl_seconds` in `app.yaml`:

```yaml
cache:
  service_ttl_seconds: 15
```

For read-only NOC screens that never use the editors, 30 seconds is safe.

---

### Scenario: Prometheus is receiving too many queries

**Symptom**: High `last_batch.query_count` in `/api/stats/telemetry`, or Prometheus CPU usage spikes every minute.

**Cause**: `max_ids_per_query` is too low (many small queries) or `cache_ttl_seconds` is too short.

**Fix 1 — Increase `max_ids_per_query`:**

```yaml
planner:
  max_ids_per_query: 100   # default: 50
```

This produces larger (but fewer) regex matchers. Prometheus handles these well up to a few hundred IDs per expression.

**Fix 2 — Increase `cache_ttl_seconds`:**

```yaml
planner:
  cache_ttl_seconds: 120
```

The snapshot is reused for 2 minutes instead of 1. Appropriate for stable clusters where operators tolerate slightly stale health states.

---

### Scenario: high memory usage in the backend

**Symptom**: Backend RSS growing over time, `cache_hits` ratio declining.

**Cause**: `PrometheusClient` caches accumulating entries faster than the 5-minute eviction runs.

**Fix**: The eviction cycle (`_evict_expired_cache`) runs automatically every 300 seconds. If you have an unusually high number of distinct PromQL queries (e.g. many unique `expand_by_label` combinations), lower the metrics cache TTL to reduce retention:

```yaml
telemetry:
  metrics_ttl_seconds: 60   # default: 120
```

---

### Scenario: stale data shown in browser after topology edit

**Symptom**: After saving changes in the Topology Editor, the UI still shows old data.

**Cause**: `fetchWithCache` is returning the localStorage-cached value.

**Fix**: This is expected — the frontend cache is invalidated per-key only for mutations that go through the API client's write methods. If you edited YAML files directly on disk and reloaded the backend, the frontend localStorage is not notified.

**Solution**: Hard-refresh the browser (`Ctrl+Shift+R`) or wait for the TTL to expire (max 2 minutes for most endpoints). The API client's mutation methods (`addRackDevice`, `updateRackDevices`, etc.) call `writeCache(key, null)` automatically, so editor-driven changes propagate within the next poll cycle.

---

### Summary: which TTL to adjust for what

| Goal | Parameter | Location | Default |
|---|---|---|---|
| Faster alert propagation | `planner.cache_ttl_seconds` | `app.yaml` | 60s |
| Reduce Prometheus load | `planner.cache_ttl_seconds` ↑ | `app.yaml` | 60s |
| Fewer small PromQL queries | `planner.max_ids_per_query` ↑ | `app.yaml` | 50 |
| Faster UI updates | `cache.service_ttl_seconds` ↓ | `app.yaml` | 5s |
| Reduce backend CPU | `cache.service_ttl_seconds` ↑ | `app.yaml` | 5s |
| Reduce Prometheus HTTP for metrics | `telemetry.metrics_ttl_seconds` ↑ | `app.yaml` | 120s |
| Reduce Prometheus HTTP for health | `telemetry.health_checks_ttl_seconds` ↑ | `app.yaml` | 60s |
| Suppress transient alert flapping | `for_duration` on the check | `config/checks/library/*.yaml` | unset |
