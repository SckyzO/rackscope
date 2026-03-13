---
id: performance-tuning
title: Performance Tuning
sidebar_position: 5
---

# Performance Tuning

This guide explains how to tune Rackscope for large deployments. It covers the four cache layers, key `app.yaml` knobs, and a diagnosis workflow using the built-in telemetry stats endpoint.

---

## Cache architecture

Rackscope has four caching layers stacked vertically. Every incoming frontend request passes through all four, and a hit at any layer stops propagation to the layers below:

```
Frontend request
    │
    ▼
ServiceCache  (cache.service_ttl_seconds — default 5s)
    │  Caches fully assembled JSON responses, per endpoint key.
    │  A hit here skips all Python logic.
    ▼
TelemetryPlanner snapshot  (planner.cache_ttl_seconds — default 60s)
    │  Caches the full node/chassis/rack health state map.
    │  A hit here returns states without touching Prometheus.
    ▼
PrometheusClient health cache  (cache.health_checks_ttl_seconds — default 30s)
    │  Caches raw PromQL query results for health checks.
    ▼
PrometheusClient metrics cache  (cache.metrics_ttl_seconds — default 120s)
    │  Caches raw PromQL results for detailed metric queries
    │  (temperature, power, PDU — triggered by include_metrics=true).
    ▼
Prometheus HTTP API
```

These four TTLs are configured independently in `app.yaml`:

```yaml
cache:
  health_checks_ttl_seconds: 60   # raw PromQL results for health checks
  metrics_ttl_seconds: 120        # raw PromQL results for metric views
  service_ttl_seconds: 5          # assembled JSON responses

planner:
  cache_ttl_seconds: 60           # PlannerSnapshot TTL
  max_ids_per_query: 200          # IDs batched per PromQL regex match
```

---

## Quick reference: symptoms and remedies

| Symptom | Probable cause | Fix |
|---------|---------------|-----|
| Health states are stale by several minutes | `planner.cache_ttl_seconds` or `cache.health_checks_ttl_seconds` too high | Reduce both to 30–45s |
| Prometheus CPU spikes every N seconds | Refresh intervals and cache TTLs too low | Increase `planner.cache_ttl_seconds` and `refresh.room_state_seconds` |
| High `cache_misses` in `/api/stats/telemetry` | `cache.health_checks_ttl_seconds` shorter than `planner.cache_ttl_seconds` | Align them or make health TTL >= planner TTL |
| Dashboard page feels slow for NOC operators | `cache.service_ttl_seconds` too low | Raise to 10–15s; operators do not need sub-5s dashboard staleness |
| Metric charts are slow to appear | Normal: `include_metrics=true` triggers 20+ Prometheus queries | Raise `cache.metrics_ttl_seconds` to 180–300s; metric trends do not change in seconds |
| `URI Too Long` errors from Prometheus | `planner.max_ids_per_query` too high for long node IDs | Reduce to 100–150 |
| Prometheus shows many small queries per batch | `planner.max_ids_per_query` too low | Raise to 300–500 for short IDs |
| `in_flight` count spikes in `/api/stats/telemetry` | Many concurrent frontend requests arriving on cache expiry | Normal; the `asyncio.Lock` in the planner limits this to one recomputation at a time |

---

## Tuning each TTL

### `planner.cache_ttl_seconds`

This is the single most impactful setting. It controls how long the entire computed health state map (all nodes, all racks, all checks) is reused before re-querying Prometheus.

**Effect:**
- Low value (e.g. 15s): Health states refresh quickly, but every expiry triggers a full PromQL batch — all checks × all batched ID sets. At 500 nodes with 10 checks, that is 50+ Prometheus queries every 15 seconds.
- High value (e.g. 120s): Prometheus load is very low, but failures take up to 2 minutes to appear.

**Recommended values:**

| Cluster size | Recommended |
|---|---|
| < 100 nodes | 30s |
| 100 – 500 nodes | 60s |
| 500 – 2000 nodes | 90 – 120s |
| > 2000 nodes | 120 – 300s |

### `cache.health_checks_ttl_seconds`

TTL for individual PromQL query results inside `PrometheusClient._health_cache`. This cache is used by the planner when it recomputes a snapshot.

**Key rule:** keep this value greater than or equal to `planner.cache_ttl_seconds`. If the health cache expires before the planner snapshot does, planner recomputations re-query Prometheus even though the snapshot was still valid — defeating the purpose. A mismatch produces unnecessary cache misses without any freshness benefit.

```yaml
# Correct: health cache outlives planner snapshot
cache:
  health_checks_ttl_seconds: 90
planner:
  cache_ttl_seconds: 60
```

### `cache.metrics_ttl_seconds`

TTL for detailed metric queries (temperature, power, PDU data loaded when `include_metrics=true`). These queries are expensive — a single rack view can issue 20+ Prometheus range and instant queries.

The default of 120s is intentional. Increase this aggressively for large deployments:

```yaml
cache:
  metrics_ttl_seconds: 300   # 5 minutes — metrics charts are not real-time
```

### `cache.service_ttl_seconds`

The outermost cache layer. Caches fully assembled JSON responses for endpoints like `GET /api/rooms/{id}/state`, `GET /api/stats/global`, and `GET /api/racks/{id}/state`. When a request hits this cache, Python computation and planner access are both skipped entirely.

The default of 5s is conservative — it exists mainly to absorb burst traffic when multiple browser tabs reload simultaneously. For NOC dashboards with auto-refresh every 30–60 seconds, raising this to 10–15s eliminates redundant computation without any perceivable staleness.

```yaml
cache:
  service_ttl_seconds: 10
```

---

## `max_ids_per_query`

Controls how many topology IDs are packed into a single PromQL regex match.

Instead of one query per node, the planner builds batched queries like:

```promql
up{instance=~"^(?:compute00[1-9]|compute0[1-9][0-9]|compute[1-9][0-9]{2})$"}
```

When the ID list for a check exceeds `max_ids_per_query`, it is split into multiple chunks. A topology with 1000 nodes and `max_ids_per_query: 200` produces 5 queries per check rather than 1000.

**Tradeoff:**

| Higher value | Lower value |
|---|---|
| Fewer total queries to Prometheus | More queries, each smaller |
| Risk of `URI Too Long` (HTTP 414) | Safer for long node names |
| Higher Prometheus per-query parse cost | Prometheus parse cost distributed across more queries |

**Prometheus's practical limit** is around 4000–8000 bytes in the query parameter. At 15-character node IDs, 200 IDs per query is well within limits. At 40-character IDs, reduce to 80–100.

**Check the current batch size:**

```bash
curl -s http://localhost:8000/api/stats/telemetry | python3 -m json.tool
```

Look at `last_batch.total_ids` / `last_batch.query_count` to compute the effective average. If average IDs per query is far below `max_ids_per_query`, the topology is already smaller than the limit and the setting has no impact.

---

## Large deployment checklists

### 500+ nodes

```yaml
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60

cache:
  health_checks_ttl_seconds: 90
  metrics_ttl_seconds: 180
  service_ttl_seconds: 10

planner:
  cache_ttl_seconds: 60
  max_ids_per_query: 300
```

Verify with `/api/stats/telemetry`:
- `last_batch.query_count` should be well under 100 per refresh cycle.
- `cache_hits / (cache_hits + cache_misses)` should be above 90%.

### 1000+ nodes

```yaml
refresh:
  room_state_seconds: 90
  rack_state_seconds: 90

cache:
  health_checks_ttl_seconds: 120
  metrics_ttl_seconds: 300
  service_ttl_seconds: 15

planner:
  cache_ttl_seconds: 90
  max_ids_per_query: 300
```

Additional Prometheus-side tuning:
- Ensure the Prometheus scrape interval for node exporters is no shorter than 15s. Sub-15s scrapes amplify query load without improving health state accuracy.
- Enable Prometheus query result caching (built-in since Prometheus 2.x) by setting `--query.lookback-delta` appropriately.

### Suppressing UNKNOWN state noise

For nodes that are powered off intentionally (test benches, spares) and have no running exporter, the default `UNKNOWN` state propagates to the rack and room level — creating false alerts. Suppress this by setting:

```yaml
planner:
  unknown_state: OK
```

This marks devices with no Prometheus data as `OK` rather than `UNKNOWN`. Use only when all uninstrumented devices are known-good. For mixed environments, prefer checking only the nodes that have exporter targets by scoping checks to specific templates.

---

## Monitoring via `/api/stats/telemetry`

The telemetry stats endpoint exposes live metrics about the planner and Prometheus client:

```bash
curl http://localhost:8000/api/stats/telemetry
```

```json
{
  "query_count": 4821,
  "cache_hits": 4712,
  "cache_misses": 109,
  "in_flight": 0,
  "last_batch": {
    "total_ids": 512,
    "query_count": 18,
    "max_ids_per_query": 200,
    "ts": 1741823600000
  },
  "last_ms": 43.2,
  "avg_ms": 38.7
}
```

**Interpreting the fields:**

| Field | What to look for |
|-------|----------------|
| `cache_hits / (cache_hits + cache_misses)` | Should be > 90% in steady state. Low hit rate means TTLs are too short or the planner is recomputing more often than expected. |
| `in_flight` | Should be 0 or 1 under normal load. A sustained non-zero value means Prometheus is slow to respond. |
| `last_batch.query_count` | Should scale as `ceil(total_ids / max_ids_per_query) × checks_count`. If much higher, check for checks with empty target sets. |
| `avg_ms` | Typical Prometheus query latency. Values above 500ms indicate Prometheus resource pressure. |

Enable `debug_stats: true` in `telemetry` to emit per-query timing to the backend log:

```yaml
telemetry:
  debug_stats: true
```

This adds log lines like:

```
DEBUG Telemetry batch: ids=512 queries=18 max_ids=200
```

Disable in production to avoid log volume.

---

## TopologyIndex — no tuning required

The `TopologyIndex` (introduced in Phase 8) is built automatically on every topology reload and provides O(1) lookups for rack, device, and room objects. It requires no configuration and has no tuning knobs. It is transparent to operators — all topology-traversal code uses it internally.

The index is always in sync with the loaded topology. Its memory footprint is proportional to topology size and is negligible compared to the Prometheus result cache.
