---
id: telemetry-planner
title: TelemetryPlanner Internals
sidebar_position: 3
---

# TelemetryPlanner Internals

Developer reference for `src/rackscope/telemetry/planner.py` and its interaction with the `PrometheusClient` in `src/rackscope/telemetry/prometheus.py`.

---

## Role

The `TelemetryPlanner` exists to solve one problem: **query explosion**.

Without batching, a cluster with 1000 nodes would fire 1000 individual PromQL queries on every refresh cycle (`up{instance="compute001"}`, `up{instance="compute002"}`, …). This degrades Prometheus performance and blows through connection limits.

The planner instead:

1. Collects all topology IDs (node, chassis, rack) from the loaded `Topology`.
2. Groups IDs into compact regex-based vector queries: `up{instance=~"^(?:compute[0-9]{3})$"}`.
3. Splits ID lists into chunks when they exceed `max_ids_per_query` to respect URL length limits.
4. Executes all batched queries concurrently and evaluates check rules on every returned time series.
5. Caches the resulting `PlannerSnapshot` for `cache_ttl_seconds`. All frontend requests within that window share the same snapshot at zero compute cost.

---

## PlannerSnapshot

`PlannerSnapshot` is a frozen dataclass produced by one full planning cycle. It holds all health states computed from the last Prometheus query batch:

```python
@dataclass
class PlannerSnapshot:
    generated_at: float                         # time.monotonic() when built

    node_states:    Dict[str, str]              # instance_id → "OK"|"WARN"|"CRIT"|"UNKNOWN"
    chassis_states: Dict[str, str]              # device_id → severity
    rack_states:    Dict[str, str]              # rack_id → severity

    rack_nodes:     Dict[str, List[str]]        # rack_id → [instance_ids]

    node_checks:    Dict[str, Dict[str, str]]   # instance_id → {check_id: severity}
    chassis_checks: Dict[str, Dict[str, str]]   # device_id → {check_id: severity}
    rack_checks:    Dict[str, Dict[str, str]]   # rack_id → {check_id: severity}

    node_alerts:    Dict[str, Dict[str, str]]   # like *_checks, but only WARN/CRIT entries
    chassis_alerts: Dict[str, Dict[str, str]]
    rack_alerts:    Dict[str, Dict[str, str]]
```

**Key rules:**

- `*_states` maps contain an entry for every ID in the topology. IDs that returned no Prometheus data get the configured `unknown_state` (default `"UNKNOWN"`).
- `*_checks` maps contain every check result, including `OK` ones. `*_alerts` maps contain only non-OK results — they are the subset used for alert count badges and the alerts dashboard.
- `rack_states` is derived from the max severity across the rack's own checks **and** all node states for nodes in that rack. A single CRIT node propagates CRIT to the rack.
- `rack_nodes` is populated during topology traversal and used in the rack state derivation step. It maps each rack ID to the flat list of instance IDs it contains.

---

## `get_snapshot()` — cache check and thundering-herd prevention

```python
async def get_snapshot(
    self,
    topology: Topology,
    checks: ChecksLibrary,
    targets_by_check: Optional[Dict[str, Dict[str, List[str]]]] = None,
) -> PlannerSnapshot:
```

The method implements a **double-checked locking** pattern:

```
Request arrives
    │
    ├─ Snapshot fresh?  ──yes──► return cached snapshot  (0 Prometheus calls)
    │
    └─ Acquire asyncio.Lock
           │
           ├─ Re-check freshness inside lock (another coroutine may have just recomputed)
           │       └─ Still fresh? ──yes──► return snapshot  (0 Prometheus calls)
           │
           └─ Call _recompute(topology, checks, targets_by_check)
                  │  Runs full Prometheus query batch.
                  └─ Store new snapshot, release lock.
                     All coroutines that were waiting on the lock now return
                     the freshly computed snapshot.
```

The `asyncio.Lock` ensures that when 50 room panels open simultaneously just as the snapshot expires, exactly **one** recomputation runs. The other 49 wait, then all return the same fresh snapshot. Without the lock, all 50 would trigger independent Prometheus batches simultaneously — the thundering herd problem.

---

## `_recompute()` — the full query cycle

`_recompute()` performs these steps in sequence:

### Step 1: Topology ID collection

```python
node_ids, chassis_ids, rack_ids, rack_nodes = _collect_topology_ids(topology)
```

`_collect_topology_ids()` walks the full `Site → Room → Aisle → Rack → Device` hierarchy, expanding all `instance` patterns (`"compute[001-064]"` → 64 strings) and deduplicating. The result is three flat lists of unique string IDs.

### Step 2: Query building

```python
queries = _build_queries(
    checks.checks,
    node_ids, chassis_ids, rack_ids,
    self.config.max_ids_per_query,
    self.config.job_regex,
    targets_by_check,
)
```

See the [Batching algorithm](#batching-algorithm) section below for the full expansion logic.

### Step 3: Prometheus execution

Each `(CheckDefinition, query_string)` pair is sent to `prom_client.query(query, cache_type="health")`. Results are deserialized and check rules are evaluated for each returned time series.

### Step 4: Discovery pre-pass for virtual nodes

Before the main query loop, checks with `expand_by_label` set run a separate discovery query (`expand_discovery_expr`). This pre-populates virtual node keys with `expand_absent_state` so that absent slots are not silently ignored. See [Virtual nodes](#virtual-nodes) below.

### Step 5: Debounce (`for_duration`)

If a check has a `for` field (e.g., `for: 5m`), the planner tracks when each `(check_id, key)` pair first entered a failing state in `_pending_states`. The severity is not promoted to WARN/CRIT until `for_duration` has continuously elapsed. On state change, the timer resets.

```yaml
# Check fires CRIT only after 2 continuous minutes of failure:
- id: pmc_power_crit
  scope: rack
  expr: sum by (rack_id) (sequana3_pmc_total_watt{rack_id=~"$racks"})
  output: numeric
  for: 2m
  rules:
    - op: ">"
      value: 20000
      severity: CRIT
```

Pending state is cleaned up automatically: entries for IDs no longer in the topology are purged on every `_recompute()` call, and any entry pending for more than 24 hours is force-evicted.

### Step 6: Rack state derivation

After all check results are processed, rack states are derived by aggregating all node states in `rack_nodes[rack_id]`. The max severity wins:

```
rack_state = max(rack_check_results, node_state_max)
```

### Step 7: Snapshot storage

The completed `PlannerSnapshot` is stored in `self._snapshot` and returned.

---

## Batching algorithm

### Placeholder replacement

Check expressions use four placeholders:

| Placeholder | Replaced with | Source |
|---|---|---|
| `$instances` | Regex of all node IDs | `node_ids` from topology |
| `$chassis` | Regex of all device IDs | `chassis_ids` from topology |
| `$racks` | Regex of all rack IDs | `rack_ids` from topology |
| `$jobs` | `job_regex` from config | `telemetry.job_regex` in `app.yaml` |

`_expand_placeholder()` replaces the token in each expression, splitting the ID list into chunks of at most `max_ids_per_query`. A list of 250 IDs with `max_ids_per_query: 100` produces 3 separate PromQL expressions for that check.

```python
# 3 expressions produced from this call:
_expand_placeholder(
    ['up{instance=~"$instances"}'],
    "$instances",
    ids=[...250 ids...],
    max_ids_per_query=100,
)
# Result:
# ['up{instance=~"^(?:...)$"}',   # ids 0-99
#  'up{instance=~"^(?:...)$"}',   # ids 100-199
#  'up{instance=~"^(?:...)$"}']   # ids 200-249
```

### Trie-based regex compression

`_regex_for_ids()` builds compact regexes using a trie rather than a naive `id1|id2|id3` join. This keeps label matcher sizes manageable:

```
# Naive join (250 chars for 10 nodes):
compute001|compute002|compute003|compute004|compute005|...

# Trie-compressed (20 chars):
compute00[1-9]|compute01[0-4]
```

The trie builder (`_build_trie`, `_trie_to_regex`) groups common prefixes recursively. Digit characters in the same position are collapsed into character class ranges (`[0-9]`, `[3-7]`). The resulting regex is wrapped in `^(?:...)$` anchors before being inserted into the PromQL label matcher.

---

## Virtual nodes

Some checks need one health state per sub-element of a device, not one state per device. The canonical example is a storage array where each drive slot is a separate Prometheus series:

```promql
eseries_drive_status{instance="storage-01", slot="0"}  → 1
eseries_drive_status{instance="storage-01", slot="1"}  → 0
eseries_drive_status{instance="storage-01", slot="2"}  → 1
```

This is modeled with `expand_by_label` in the check definition:

```yaml
checks:
  - id: drive_status
    name: Drive Status
    kind: storage
    scope: node
    expr: eseries_drive_status{instance=~"$instances"}
    output: bool
    expand_by_label: slot
    expand_discovery_expr: eseries_drive_info{instance=~"$instances"}
    expand_absent_state: UNKNOWN
    expand_crit_threshold: 2
    rules:
      - op: "=="
        value: 0
        severity: CRIT
```

The planner creates a **virtual node** for each `(instance, slot)` pair:

- The virtual node key is `"storage-01:slot0"`, `"storage-01:slot1"`, etc.
- Each virtual node gets its own entry in `node_states`.
- After all queries run, virtual node states are propagated back to the parent instance (`storage-01`) using `expand_crit_threshold` logic:
  - If `crit_count >= threshold`, parent becomes CRIT.
  - If `crit_count < threshold` but `crit_count > 0`, parent becomes WARN.
  - Any WARN virtual node contributes WARN to the parent.

**Discovery pre-pass:** The `expand_discovery_expr` query runs first to enumerate all expected slot IDs. Any slot discovered by this query but absent from the main status query is pre-seeded with `expand_absent_state` (defaults to `unknown_state` from config). This prevents silently ignoring drives that disappear from the status metric entirely.

---

## In-flight deduplication in PrometheusClient

The `PrometheusClient` has its own in-flight deduplication layer below the planner:

```python
class PrometheusClient:
    _in_flight: Dict[str, asyncio.Task]
```

When two concurrent callers issue the same PromQL query string and both find a cache miss, the first creates an `asyncio.Task` via `asyncio.create_task(self._fetch_query(query))` and stores it in `_in_flight`. The second caller finds the existing task and awaits it directly. Only one HTTP request is made.

The task is removed from `_in_flight` once it completes (either successfully cached or errored). This deduplication is transparent to the planner.

**Three independent result caches exist in `PrometheusClient`:**

| Cache dict | `cache_type` argument | TTL configured by |
|---|---|---|
| `_health_cache` | `"health"` | `cache.health_checks_ttl_seconds` |
| `_metrics_cache` | `"metrics"` | `cache.metrics_ttl_seconds` |
| `_cache` | `None` (generic) | `cache.ttl_seconds` (deprecated) |

The planner always passes `cache_type="health"` so its queries go to `_health_cache`. Metric service queries use `cache_type="metrics"`. The generic cache is kept for backward compatibility with any direct `prom_client.query()` calls that do not specify a cache type.

---

## Template-scoped targets

By default, the planner queries all topology IDs for every check — even for checks that no device template references. `targets_by_check` enables template-scoped mode: only IDs that actually reference a check in their template are included.

This is produced by `telemetry_service.collect_check_targets()` and cached in `TARGETS_BY_CHECK` at the `app.py` level:

```python
# app.py global state (rebuilt on every config reload):
TARGETS_BY_CHECK: Optional[Dict[str, Dict[str, List[str]]]] = None
```

```python
# Structure:
{
  "node_up": {
    "node": ["compute001", "compute002", ...],
    "chassis": [],
    "rack": [],
  },
  "pdu_current_warn": {
    "node": [],
    "chassis": [],
    "rack": ["rack-a01", "rack-a02", ...],
  },
}
```

When `targets_by_check` is passed to `get_snapshot()`, `_build_queries()` uses the scoped ID lists instead of the full topology lists. Checks with no scoped targets are skipped entirely. This avoids querying rack-scoped PDU metrics for every node in the topology.

---

## How to add a new check that uses the planner

1. Create a YAML check definition in `config/checks/library/`:

```yaml
checks:
  - id: my_check
    name: My Check
    kind: server
    scope: node                      # or chassis / rack
    expr: my_metric{instance=~"$instances", job=~"$jobs"}
    output: numeric
    rules:
      - op: ">"
        value: 90
        severity: WARN
      - op: ">"
        value: 99
        severity: CRIT
```

2. Reference the check ID in a device or rack template:

```yaml
templates:
  - id: my-server
    type: server
    u_height: 1
    checks:
      - node_up
      - my_check          # added here
```

3. Restart the backend (`make restart`). The planner picks up the check from `CHECKS_LIBRARY` automatically. No code changes needed.

**For storage-array-style per-slot checks**, add `expand_by_label`, `expand_discovery_expr`, `expand_absent_state`, and optionally `expand_crit_threshold` to the definition. The planner handles the virtual node expansion automatically.

**For debounced checks** that should only fire after a sustained failure, add `for: 2m` (or any Prometheus duration string: `30s`, `5m`, `1h`). The planner maintains its own pending-state timer independently of Prometheus's alerting pipeline.

---

## ServiceCache — the layer above the planner

`ServiceCache` (`src/rackscope/api/cache.py`) sits above the planner and caches assembled endpoint responses. A hit in `ServiceCache` never reaches the planner at all.

```python
class ServiceCache:
    async def get(self, key: str) -> Optional[Any]: ...
    async def set(self, key: str, value: Any, ttl: float) -> None: ...
    async def invalidate_prefix(self, prefix: str) -> int: ...
    async def invalidate_all(self) -> None: ...
```

Cache keys follow the pattern `"<scope>:<id>:<endpoint>"`, for example:
- `"room:dc1-r001:state"` — room state endpoint
- `"rack:a01-r03:state"` — rack state without metrics
- `"rack:a01-r03:state:metrics"` — rack state with metrics
- `"rooms:states"` — bulk rooms endpoint
- `"stats:global"` — global stats

**TTL selection per endpoint:**

| Endpoint | `include_metrics` | TTL used |
|---|---|---|
| `/api/stats/global` | n/a | `service_ttl_seconds` |
| `/api/rooms/{id}/state` | n/a | `service_ttl_seconds` |
| `/api/rooms/states` | n/a | `service_ttl_seconds` |
| `/api/racks/{id}/state` | false | `service_ttl_seconds` |
| `/api/racks/{id}/state` | true | `metrics_ttl_seconds` |

**Invalidation:** `SERVICE_CACHE.invalidate_all()` is called automatically by `apply_config()` on every topology reload. There is no need to manually invalidate — stale entries expire naturally via TTL, and a full config reload always clears everything immediately.

When writing new endpoints, inject the cache via the `get_service_cache` dependency and follow the existing pattern:

```python
from rackscope.api.dependencies import get_service_cache
from rackscope.api.cache import ServiceCache

@router.get("/api/my-endpoint/{id}")
async def my_endpoint(
    id: str,
    svc_cache: Annotated[ServiceCache, Depends(get_service_cache)],
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    _cache_key = f"my-scope:{id}:data"
    _ttl = float(app_config.cache.service_ttl_seconds) if app_config else 5.0
    cached = await svc_cache.get(_cache_key)
    if cached is not None:
        return cached

    result = await _compute_expensive_thing(id)
    await svc_cache.set(_cache_key, result, ttl=_ttl)
    return result
```
