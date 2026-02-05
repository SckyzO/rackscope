# Virtual Nodes Expansion for Per-Unit Health Checks

## Context & Problem Statement

### Current Limitation

Storage arrays (and similar multi-unit devices) have a **single Prometheus instance** (controller) that exports **multiple metrics with labels** for individual units (drives, disks, shelves).

**Example E-Series architecture:**
```
Instance: da01-r02-01 (controller)
Metrics:
  eseries_drive_status{instance="da01-r02-01", slot="1", status="optimal"} 0
  eseries_drive_status{instance="da01-r02-01", slot="2", status="optimal"} 0
  eseries_drive_status{instance="da01-r02-01", slot="3", status="failed"} 1
  ...
  eseries_drive_status{instance="da01-r02-01", slot="60", status="optimal"} 0
```

**Current behavior:**
- Backend evaluates check at **instance level** → 1 result for entire array
- Frontend displays **60 disk slots** but all share same health state
- **Problem:** Cannot show individual disk colors (slot 3 is failed but all disks show same color)

**Desired behavior:**
- Backend creates **virtual nodes** per disk: `da01-r02-01:slot1`, `da01-r02-01:slot2`, etc.
- Each virtual node has its own health state
- Frontend displays **individual disk colors** (slot 3 red, others green)

### Why Generic?

This is NOT an E-Series-specific problem. Other storage vendors have similar architectures:

- **DDN**: `ddn_drive_health{instance="ddn01", enclosure="1", drive="5"}`
- **NetApp**: `netapp_disk_status{instance="filer01", shelf="2", disk="3"}`
- **IBM**: `ibm_drive_state{instance="ibm-storage", controller="A", slot="12"}`

**Generic solution:** Use `expand_by_label` field in check definition to specify which label to expand.

---

## Architecture Overview

### Components Involved

1. **Check Definition** (`src/rackscope/model/checks.py`)
   - Defines which label to expand with `expand_by_label` field
   - Example: `expand_by_label: "slot"` for E-Series

2. **TelemetryPlanner** (`src/rackscope/telemetry/planner.py`)
   - Queries Prometheus for checks
   - Creates virtual nodes from label values
   - Evaluates check rules per virtual node

3. **Frontend** (`frontend/src/components/RackVisualizer.tsx`, `frontend/src/pages/DevicePage.tsx`)
   - Generates virtual node IDs matching backend format
   - Maps virtual nodes to disk slots in UI

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Check Definition (checks/library/eseries.yaml)              │
│    - id: eseries_drive_status                                   │
│    - expand_by_label: "slot"                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. TelemetryPlanner.get_snapshot()                             │
│    - Query Prometheus with check expr                           │
│    - Extract unique label values (slot=1, slot=2, ..., slot=60)│
│    - Create virtual nodes: instance:slot1, instance:slot2, ...  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PlannerSnapshot                                              │
│    - node_states: {                                             │
│        "da01-r02-01:slot1": "OK",                               │
│        "da01-r02-01:slot2": "OK",                               │
│        "da01-r02-01:slot3": "CRIT",                             │
│        ...                                                       │
│      }                                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Frontend (RackVisualizer)                                    │
│    - nodeMap = {1: "da01-r02-01:slot1", 2: "da01-r02-01:slot2"}│
│    - Look up nodeHealth from nodesData["da01-r02-01:slot1"]     │
│    - Render disk with color based on state                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Prometheus Query Enhancement (TelemetryPlanner)

**File:** `src/rackscope/telemetry/planner.py`

**Current behavior:**
```python
# Query: eseries_drive_status{status!~"(optimal)",instance=~"da01-r02-01|da02-r02-01|..."}
# Result: Single metric per instance (if any drive failed)
# Evaluation: 1 state per instance
```

**Desired behavior:**
```python
# Query: eseries_drive_status{status!~"(optimal)",instance=~"da01-r02-01|da02-r02-01|..."}
# Result: Multiple metrics per instance (one per slot)
# Evaluation: 1 state per (instance, slot) → virtual node
```

#### Step 1.1: Detect Expandable Checks

In `_build_queries()` function:

```python
def _build_queries(
    checks: List[CheckDefinition],
    node_ids: List[str],
    chassis_ids: List[str],
    rack_ids: List[str],
    max_ids_per_query: int,
    job_regex: str,
    targets_by_check: Optional[Dict[str, Dict[str, List[str]]]] = None,
) -> List[Tuple[CheckDefinition, str, str]]:
    """
    Build PromQL queries for all checks.

    Returns:
        List of (check_definition, scope, query_string)
    """
    # ... existing code ...

    # Track checks that need expansion
    expandable_checks = [c for c in checks if c.expand_by_label]
    regular_checks = [c for c in checks if not c.expand_by_label]

    # Build queries for regular checks (existing logic)
    queries = []
    for check in regular_checks:
        # ... existing query building logic ...
        pass

    # Build queries for expandable checks (fetch ALL label values)
    for check in expandable_checks:
        # Query WITHOUT filtering by status to get all label values
        # We'll filter results during evaluation
        expand_query = check.expr.replace("{", "{")  # Keep original query
        # ... build batched queries like regular checks ...
        queries.append((check, check.scope, expand_query))

    return queries
```

#### Step 1.2: Parse Results with Label Values

In `get_snapshot()` function, after executing queries:

```python
async def get_snapshot(
    self,
    topology: Topology,
    checks: ChecksLibrary,
    targets_by_check: Optional[Dict[str, Dict[str, List[str]]]] = None,
) -> PlannerSnapshot:
    # ... existing cache check ...

    node_ids, chassis_ids, rack_ids, rack_nodes = _collect_topology_ids(topology)
    queries = _build_queries(...)

    # Execute queries
    query_results = {}
    for check, scope, query in queries:
        result = await self.prom_client.query_instant(query)
        query_results[(check.id, scope)] = result

    # NEW: Process expandable checks
    virtual_node_states = {}
    virtual_node_checks = {}
    virtual_node_alerts = {}

    for check in checks.checks:
        if not check.expand_by_label:
            continue  # Skip non-expandable checks

        result = query_results.get((check.id, check.scope), [])

        # Extract virtual nodes from label values
        for metric in result:
            labels = metric.get("metric", {})
            instance = labels.get("instance")
            label_value = labels.get(check.expand_by_label)  # e.g., slot="3"

            if not instance or not label_value:
                continue

            # Create virtual node ID
            virtual_node_id = f"{instance}:{check.expand_by_label}{label_value}"
            # e.g., "da01-r02-01:slot3"

            # Evaluate check rule for this virtual node
            value = float(metric.get("value", [0, 0])[1])
            state = _evaluate_check_rules(check, value, labels)

            # Store virtual node state
            if virtual_node_id not in virtual_node_states:
                virtual_node_states[virtual_node_id] = state
            else:
                # Aggregate multiple checks for same virtual node
                virtual_node_states[virtual_node_id] = _aggregate_states([
                    virtual_node_states[virtual_node_id],
                    state
                ])

            # Track checks and alerts
            if virtual_node_id not in virtual_node_checks:
                virtual_node_checks[virtual_node_id] = {}
            virtual_node_checks[virtual_node_id][check.id] = state

            if state in ["WARN", "CRIT"]:
                if virtual_node_id not in virtual_node_alerts:
                    virtual_node_alerts[virtual_node_id] = {}
                virtual_node_alerts[virtual_node_id][check.id] = state

    # Merge virtual nodes into regular node states
    node_states.update(virtual_node_states)
    node_checks.update(virtual_node_checks)
    node_alerts.update(virtual_node_alerts)

    # ... rest of existing snapshot logic ...

    return PlannerSnapshot(
        node_states=node_states,
        node_checks=node_checks,
        node_alerts=node_alerts,
        # ... other fields ...
    )
```

#### Step 1.3: Helper Function for Rule Evaluation

Add helper function in `planner.py`:

```python
def _evaluate_check_rules(
    check: CheckDefinition,
    value: float,
    labels: Dict[str, str]
) -> str:
    """
    Evaluate check rules against metric value and labels.

    Args:
        check: Check definition with rules
        value: Metric value
        labels: Metric labels (for status-based checks)

    Returns:
        State: "OK", "WARN", "CRIT", or "UNKNOWN"
    """
    if check.output == "bool":
        # Boolean checks (0 = OK, 1 = triggered)
        if value == 0:
            return "OK"
        # Find matching rule for value=1
        for rule in check.rules:
            if rule.op == "==" and rule.value == 1:
                return rule.severity
        return "UNKNOWN"

    elif check.output == "numeric":
        # Check if this is a status-label-based check (E-Series pattern)
        status_label = labels.get("status")
        if status_label:
            # Value indicates if this status is active (1) or not (0)
            if value == 1:
                # This status is active, apply rule severity
                for rule in check.rules:
                    if rule.op == "==" and rule.value == 1:
                        return rule.severity
                return "UNKNOWN"
            else:
                # Status not active, check if it's optimal
                # If status="optimal" and value=0, it's NOT optimal → UNKNOWN
                # We need to check ALL statuses to determine state
                # This requires different logic - see below
                pass

        # Numeric threshold checks
        for rule in check.rules:
            if _compare_values(value, rule.op, rule.value):
                return rule.severity

        return "OK"  # No rule matched

    return "UNKNOWN"

def _compare_values(actual: float, op: str, expected: Union[int, float, str]) -> bool:
    """Compare values according to operator."""
    try:
        expected_num = float(expected)
    except (ValueError, TypeError):
        return False

    if op == "==":
        return actual == expected_num
    elif op == "!=":
        return actual != expected_num
    elif op == ">":
        return actual > expected_num
    elif op == ">=":
        return actual >= expected_num
    elif op == "<":
        return actual < expected_num
    elif op == "<=":
        return actual <= expected_num

    return False
```

**Note on Status-based Checks (E-Series pattern):**

E-Series exports metrics like this:
```
eseries_drive_status{slot="1", status="optimal"} 1
eseries_drive_status{slot="1", status="failed"} 0
eseries_drive_status{slot="1", status="bypassed"} 0
```

For each slot, there are MULTIPLE metrics (one per status). The check query filters by `status!~"(optimal)"`, so we only see non-optimal statuses. **Key insight:**
- If query returns `{slot="3", status="failed"} 1` → Drive 3 is FAILED (CRIT)
- If query returns nothing for slot 3 → Drive 3 is OPTIMAL (OK)

**Implementation strategy:**
1. Query with filter: `eseries_drive_status{status!~"(optimal)",instance=~"$instances"}`
2. Returned metrics = drives with problems
3. Create virtual nodes for returned metrics with CRIT/WARN state
4. For drives NOT in results, create virtual nodes with OK state

**Alternative (simpler):**
Query WITHOUT status filter, get ALL metrics, then filter in code:
```python
query = 'eseries_drive_status{instance=~"$instances"}'
# Returns ALL status metrics for all slots
# Group by (instance, slot), find which status has value=1
```

This is more reliable but generates more data.

---

### Phase 2: Frontend Virtual Node Mapping (DONE)

**Status:** ✅ Already implemented

**Files:**
- `frontend/src/components/RackVisualizer.tsx`
- `frontend/src/pages/DevicePage.tsx`

**Implementation:**
```typescript
// For storage devices, create virtual node IDs per slot
const nodeMap = useMemo(() => {
  if (template.type === 'storage') {
    const instanceInput = device.instance || device.nodes;
    let instanceName: string;
    // ... get instance name ...

    const diskLayout = template.disk_layout || template.layout;
    if (!diskLayout?.matrix) return { 1: instanceName };

    // Create virtual node map: {slot: "instance:slotN"}
    const virtualNodeMap: Record<number, string> = {};
    diskLayout.matrix.flat().forEach((slotNum) => {
      if (slotNum > 0) {
        virtualNodeMap[slotNum] = `${instanceName}:slot${slotNum}`;
      }
    });
    return virtualNodeMap;
  }

  // For non-storage devices, use standard expansion
  return expandInstanceMap((device.instance || device.nodes) as InstanceInput);
}, [device.instance, device.nodes, device.id, template.type, template.disk_layout, template.layout]);
```

**Key points:**
- Virtual node ID format: `{instance}:slot{N}` for E-Series
- Generic: format is `{instance}:{label_name}{label_value}` for any vendor
- Frontend generates same IDs that backend creates

---

### Phase 3: Check Configuration (DONE)

**Status:** ✅ Already implemented

**File:** `config/checks/library/eseries.yaml`

```yaml
- id: eseries_drive_status
  name: E-Series drive health
  scope: node
  kind: eseries
  expr: eseries_drive_status{status!~"(optimal)",instance=~"$instances"}
  output: numeric
  expand_by_label: slot  # KEY: Create virtual nodes per slot value
  rules:
    - op: "=="
      value: 1
      severity: CRIT
```

**For other vendors:**
```yaml
# DDN example
- id: ddn_drive_health
  name: DDN drive health
  scope: node
  kind: ddn
  expr: ddn_drive_health{state!~"(online)",instance=~"$instances"}
  output: numeric
  expand_by_label: drive  # Use "drive" label instead of "slot"
  rules:
    - op: "=="
      value: 1
      severity: CRIT

# NetApp example
- id: netapp_disk_status
  name: NetApp disk status
  scope: node
  kind: netapp
  expr: netapp_disk_status{status!~"(normal)",instance=~"$instances"}
  output: numeric
  expand_by_label: disk  # Use "disk" label
  rules:
    - op: "=="
      value: 1
      severity: CRIT
```

---

## Implementation Checklist

### Backend (TelemetryPlanner)

- [ ] **Step 1:** Modify `_build_queries()` to detect checks with `expand_by_label`
  - Track expandable vs regular checks separately
  - Consider query strategy (with/without status filter)

- [ ] **Step 2:** Modify `get_snapshot()` to process expandable checks
  - After querying Prometheus, extract label values
  - Create virtual node IDs: `{instance}:{label_name}{label_value}`
  - Evaluate check rules per virtual node

- [ ] **Step 3:** Create `_evaluate_check_rules()` helper function
  - Handle `output: bool` checks
  - Handle `output: numeric` checks
  - Handle status-label-based checks (E-Series pattern)

- [ ] **Step 4:** Merge virtual nodes into PlannerSnapshot
  - Add to `node_states`, `node_checks`, `node_alerts`
  - Aggregate states (max severity wins)

- [ ] **Step 5:** Handle chassis-level aggregation
  - Virtual nodes should contribute to chassis health
  - Chassis is CRIT if any drive is CRIT, WARN if any drive is WARN

- [ ] **Step 6:** Add logging for debugging
  - Log number of virtual nodes created per check
  - Log any issues with label extraction

### Testing

- [ ] **Unit tests** for `_evaluate_check_rules()`
  - Test bool checks
  - Test numeric checks
  - Test status-label checks
  - Test unknown cases

- [ ] **Integration test** for expandable checks
  - Mock Prometheus response with multiple slots
  - Verify virtual nodes created correctly
  - Verify states evaluated correctly

- [ ] **Manual testing** with simulator
  - Verify colors appear on individual disks
  - Verify failed disk shows red
  - Verify chassis aggregates disk states
  - Test with multiple storage arrays in one rack

### Documentation

- [ ] Update API documentation with virtual node concept
- [ ] Update user guide with storage array monitoring
- [ ] Add example configuration for other vendors (DDN, NetApp)

---

## Edge Cases & Considerations

### 1. Large Number of Virtual Nodes

**Problem:** 24 racks × 6 arrays × 60 disks = 8,640 virtual nodes

**Mitigation:**
- Cache PlannerSnapshot (already done)
- Consider pagination or lazy loading in frontend (future)
- Prometheus query batching (already done)

### 2. Missing Label Values

**Problem:** Prometheus query returns metric without expected label

**Solution:**
```python
label_value = labels.get(check.expand_by_label)
if not label_value:
    logger.warning(f"Check {check.id}: metric missing label '{check.expand_by_label}'")
    continue  # Skip this metric
```

### 3. Label Value Format Variations

**Problem:** Labels might be `slot="01"`, `slot="1"`, or `slot="slot1"`

**Solution:**
- Use label value as-is in virtual node ID
- Frontend should match backend format exactly
- Document expected label format per vendor

### 4. Multiple Checks for Same Virtual Node

**Problem:** Multiple checks might create same virtual node (e.g., `eseries_drive_status` and `eseries_drive_temperature`)

**Solution:**
```python
if virtual_node_id in virtual_node_states:
    # Aggregate states (max severity wins)
    virtual_node_states[virtual_node_id] = _aggregate_states([
        virtual_node_states[virtual_node_id],
        state
    ])
```

### 5. Non-Storage Devices with Labels

**Problem:** Other device types might have label-based metrics (e.g., network switches with port metrics)

**Solution:**
- `expand_by_label` is generic, works for any device type
- Define check with `expand_by_label: "port"` for switch port checks
- Frontend would need to map port labels to UI slots (future feature)

---

## Performance Considerations

### Query Optimization

**Current:** Batched queries with `max_ids_per_query` (default: 50)

**With Virtual Nodes:**
- Same number of Prometheus queries (no increase)
- More processing in backend (creating virtual nodes)
- More data in PlannerSnapshot (~10x increase with 60 disks per array)

**Cache Strategy:**
- PlannerSnapshot cache TTL: 60s (configurable)
- Cache hit = no Prometheus queries
- Cache miss = rebuild all virtual nodes

### Memory Usage

**Estimate:**
- 8,640 virtual nodes × ~200 bytes per node = ~1.7 MB
- Acceptable for in-memory cache
- Consider compression if scaling to 100k+ virtual nodes (future)

### API Response Size

**Impact:**
- `/api/racks/{id}/state` response includes all virtual nodes
- 360 virtual nodes per storage rack (6 arrays × 60 disks)
- ~72 KB per rack (gzipped: ~10 KB)
- Acceptable for current scale

**Optimization (future):**
- Add `include_virtual_nodes=false` parameter
- Return aggregated chassis state only when not needed

---

## Testing Strategy

### Unit Tests

```python
# tests/test_planner_expansion.py

def test_evaluate_check_rules_bool():
    check = CheckDefinition(
        id="test_check",
        scope="node",
        expr="metric",
        output="bool",
        rules=[CheckRule(op="==", value=1, severity="CRIT")]
    )

    assert _evaluate_check_rules(check, 0, {}) == "OK"
    assert _evaluate_check_rules(check, 1, {}) == "CRIT"

def test_evaluate_check_rules_numeric():
    check = CheckDefinition(
        id="test_check",
        scope="node",
        expr="metric",
        output="numeric",
        rules=[
            CheckRule(op=">=", value=80, severity="WARN"),
            CheckRule(op=">=", value=90, severity="CRIT"),
        ]
    )

    assert _evaluate_check_rules(check, 70, {}) == "OK"
    assert _evaluate_check_rules(check, 85, {}) == "WARN"
    assert _evaluate_check_rules(check, 95, {}) == "CRIT"

def test_evaluate_check_rules_status_based():
    check = CheckDefinition(
        id="eseries_drive_status",
        scope="node",
        expr="eseries_drive_status{status!~\"(optimal)\"}",
        output="numeric",
        expand_by_label="slot",
        rules=[CheckRule(op="==", value=1, severity="CRIT")]
    )

    # Status="failed" with value=1 → CRIT
    assert _evaluate_check_rules(check, 1, {"status": "failed"}) == "CRIT"

    # Status="optimal" with value=0 → OK (not in filtered results)
    assert _evaluate_check_rules(check, 0, {"status": "optimal"}) == "OK"
```

### Integration Tests

```python
# tests/test_planner_integration.py

@pytest.mark.asyncio
async def test_virtual_nodes_expansion(mock_prom_client):
    # Mock Prometheus response
    mock_prom_client.query_instant.return_value = [
        {
            "metric": {"instance": "da01-r02-01", "slot": "3", "status": "failed"},
            "value": [0, 1]
        },
        {
            "metric": {"instance": "da01-r02-01", "slot": "15", "status": "bypassed"},
            "value": [0, 1]
        },
    ]

    planner = TelemetryPlanner(mock_prom_client, config)
    snapshot = await planner.get_snapshot(topology, checks, targets)

    # Check virtual nodes created
    assert "da01-r02-01:slot3" in snapshot.node_states
    assert "da01-r02-01:slot15" in snapshot.node_states

    # Check states
    assert snapshot.node_states["da01-r02-01:slot3"] == "CRIT"
    assert snapshot.node_states["da01-r02-01:slot15"] == "CRIT"

    # Check checks tracked
    assert "eseries_drive_status" in snapshot.node_checks["da01-r02-01:slot3"]
```

### Manual Testing

1. **Start simulator:**
   ```bash
   make up
   ```

2. **Query API for storage rack:**
   ```bash
   curl http://localhost:8000/api/racks/r02-01/state?include_metrics=true | jq '.nodes | keys | map(select(contains("slot")))'
   ```

   Expected: Array of virtual node IDs like `["da01-r02-01:slot1", "da01-r02-01:slot2", ...]`

3. **Check individual virtual node state:**
   ```bash
   curl http://localhost:8000/api/racks/r02-01/state?include_metrics=true | jq '.nodes["da01-r02-01:slot3"]'
   ```

   Expected: `{"state": "OK", "temperature": 0, "power": 0, "checks": [...], "alerts": [...]}`

4. **Inject failure in simulator:**
   ```bash
   # Modify simulator to set slot 5 as failed
   curl -X POST http://localhost:8000/api/simulator/overrides \
     -H "Content-Type: application/json" \
     -d '{"instance": "da01-r02-01", "metric": "eseries_drive_status", "labels": {"slot": "5", "status": "failed"}, "value": 1}'
   ```

5. **Verify frontend:**
   - Navigate to http://localhost:5173/rack/r02-01
   - Click on storage device da01-r02-01
   - Verify disk at slot 5 shows red color
   - Verify other disks show green color

---

## Success Criteria

### Functional Requirements

✅ **FR1:** Each disk in storage array has individual health color
- Green = OK
- Orange = WARN
- Red = CRIT
- Gray = UNKNOWN

✅ **FR2:** Chassis health aggregates disk states
- Chassis is CRIT if any disk is CRIT
- Chassis is WARN if any disk is WARN (and no CRIT)
- Chassis is OK if all disks are OK

✅ **FR3:** Generic solution works for any storage vendor
- Not hardcoded to E-Series
- Configuration-driven via `expand_by_label`

✅ **FR4:** Tooltip shows individual disk information
- Disk name/slot
- Health state
- Active checks
- Alerts (if any)

### Non-Functional Requirements

✅ **NFR1:** Performance acceptable for large deployments
- 24 racks × 6 arrays × 60 disks = 8,640 virtual nodes
- Rack state API response < 1s (with cache)
- Rack state API response < 5s (cache miss)

✅ **NFR2:** Cache invalidation works correctly
- Cache TTL honored (default 60s)
- Manual cache clear if needed

✅ **NFR3:** Error handling for missing/malformed metrics
- Log warnings, don't crash
- Mark as UNKNOWN if label missing

---

## Future Enhancements

### 1. Configurable Virtual Node ID Format

**Current:** Hardcoded format `{instance}:{label_name}{label_value}`

**Future:** Configurable in check definition
```yaml
expand_by_label: slot
virtual_node_format: "{instance}:slot{slot}"  # Explicit format
```

### 2. Multi-Label Expansion

**Use case:** NetApp shelves with both shelf and disk labels

```yaml
expand_by_labels: ["shelf", "disk"]
virtual_node_format: "{instance}:shelf{shelf}:disk{disk}"
```

### 3. Virtual Node Grouping

**Use case:** Show drawer-level summary before expanding to disks

```yaml
expand_by_label: slot
group_by: tray  # Group virtual nodes by tray label
```

### 4. Lazy Loading in Frontend

**Use case:** Large storage arrays (>100 disks)

- Initial view shows chassis health only
- Click to expand shows individual disk grid
- Load virtual nodes on-demand

---

## References

### Related Files

- `src/rackscope/model/checks.py` - CheckDefinition model
- `src/rackscope/telemetry/planner.py` - Query planner (needs modification)
- `config/checks/library/eseries.yaml` - E-Series check definitions
- `frontend/src/components/RackVisualizer.tsx` - Disk rendering
- `frontend/src/pages/DevicePage.tsx` - Device detail page

### Related Issues

- Storage arrays showing single color for all disks
- Need per-drive health visibility for operations
- Generic solution for multi-unit device monitoring

### Related Documentation

- `ARCHITECTURE/reference/CHECKS_LIBRARY.md` - Check system overview
- `docs/ADMIN_GUIDE.md` - Check configuration guide
- `config/templates/devices/storage/storage-4u-60disk.yaml` - E-Series template
