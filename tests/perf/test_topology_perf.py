"""
Performance benchmarks — TopologyIndex vs O(n) traversal.

Proves and quantifies the speedup from TopologyIndex (Steps 1 & 2).
Uses hpc-cluster (25 racks, ~1 912 instances) — safe on any machine.

Run manually only — NOT part of the regular CI suite:
    pytest tests/perf/ -v -s -m perf --no-header

Expected output:
    [RACK LOOKUP × 2 000]
      O(n) : ~140ms total  (0.070ms/op)
      O(1) : ~0.8ms total  (0.0004ms/op)
      Speedup: ~175×

    [SLURM build_node_context × 20]
      O(n) : ~200ms total  (10ms/call)
      O(1) : ~18ms total   (0.9ms/call)
      Speedup: ~11×
"""

import random
import timeit

import pytest

from rackscope.model.domain import build_topology_index
from rackscope.model.loader import load_topology
from rackscope.services.slurm_service import build_node_context
from rackscope.services.topology_service import (
    find_rack_by_id,
    find_rack_location,
    find_room_by_id,
)

TOPO_PATH = "config/examples/hpc-cluster/topology"
ITERATIONS = 2_000  # safe on constrained machines


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def hpc():
    """Load hpc-cluster topology once for the whole module."""
    topo = load_topology(TOPO_PATH)
    idx = build_topology_index(topo)
    return topo, idx, list(idx.racks.keys()), list(idx.rooms.keys())


# ── Helpers ───────────────────────────────────────────────────────────────────


def _bench(fn, n: int = ITERATIONS) -> float:
    """Return total seconds for n calls."""
    return timeit.timeit(fn, number=n)


def _fmt(seconds: float, n: int = ITERATIONS) -> str:
    ms_total = seconds * 1000
    ms_per_op = ms_total / n
    return f"{ms_total:.1f}ms total  ({ms_per_op:.4f}ms/op)"


def _print_result(label: str, t_slow: float, t_fast: float, n: int, capsys) -> float:
    speedup = t_slow / t_fast
    with capsys.disabled():
        print(f"\n[{label} × {n:,}]")
        print(f"  O(n) : {_fmt(t_slow, n)}")
        print(f"  O(1) : {_fmt(t_fast, n)}")
        print(f"  Speedup: {speedup:.0f}×")
    return speedup


# ── Benchmarks ────────────────────────────────────────────────────────────────


@pytest.mark.perf
def test_rack_lookup_speedup(hpc, capsys):
    """find_rack_by_id: O(n) nested loops vs O(1) dict lookup."""
    topo, idx, rack_ids, _ = hpc
    samples = [random.choice(rack_ids) for _ in range(ITERATIONS)]
    i1, i2 = iter(samples), iter(samples)

    t_slow = _bench(lambda: find_rack_by_id(topo, next(i1)))
    t_fast = _bench(lambda: find_rack_by_id(topo, next(i2), index=idx))
    speedup = _print_result("RACK LOOKUP", t_slow, t_fast, ITERATIONS, capsys)

    assert speedup >= 3, f"Expected ≥3× (index must be faster), got {speedup:.1f}×"


@pytest.mark.perf
def test_room_lookup_speedup(hpc, capsys):
    """find_room_by_id: O(n) vs O(1)."""
    topo, idx, _, room_ids = hpc
    samples = [random.choice(room_ids) for _ in range(ITERATIONS)]
    i1, i2 = iter(samples), iter(samples)

    t_slow = _bench(lambda: find_room_by_id(topo, next(i1)))
    t_fast = _bench(lambda: find_room_by_id(topo, next(i2), index=idx))
    speedup = _print_result("ROOM LOOKUP", t_slow, t_fast, ITERATIONS, capsys)

    assert speedup >= 1.5


@pytest.mark.perf
def test_rack_location_speedup(hpc, capsys):
    """find_rack_location: O(n) vs O(1) — returns site/room/aisle context."""
    topo, idx, rack_ids, _ = hpc
    samples = [random.choice(rack_ids) for _ in range(ITERATIONS)]
    i1, i2 = iter(samples), iter(samples)

    t_slow = _bench(lambda: find_rack_location(next(i1), topo))
    t_fast = _bench(lambda: find_rack_location(next(i2), topo, index=idx))
    speedup = _print_result("RACK LOCATION", t_slow, t_fast, ITERATIONS, capsys)

    assert speedup >= 3


@pytest.mark.perf
def test_slurm_node_context_speedup(hpc, capsys):
    """build_node_context: O(n) traversal+expansion vs O(1) index dict comprehension.

    Represents the cost of /api/slurm/nodes — called once per request,
    builds a dict of all instance → rack/room/site context.
    """
    topo, idx, _, _ = hpc
    n = 20  # fewer calls — each builds a ~1912-entry dict

    t_slow = _bench(lambda: build_node_context(topo), n=n)
    t_fast = _bench(lambda: build_node_context(topo, index=idx), n=n)
    speedup = t_slow / t_fast

    with capsys.disabled():
        print(f"\n[SLURM build_node_context × {n}]")
        print(f"  O(n) : {_fmt(t_slow, n)}")
        print(f"  O(1) : {_fmt(t_fast, n)}")
        print(f"  Instances indexed: {len(idx.instances):,}  Speedup: {speedup:.0f}×")

    assert speedup >= 3


@pytest.mark.perf
def test_index_build_cost(hpc, capsys):
    """One-time cost of building the index on topology reload.

    Should be fast enough to be unnoticeable at startup (< 500ms).
    """
    topo, _, _, _ = hpc
    n = 10
    t = _bench(lambda: build_topology_index(topo), n=n)
    ms = t * 1000 / n

    with capsys.disabled():
        print(f"\n[INDEX BUILD × {n}]  {ms:.1f}ms/call  (once per topology reload)")

    assert ms < 500, f"Index build takes {ms:.0f}ms — too slow"


@pytest.mark.perf
def test_summary(hpc, capsys):
    """Print topology stats for context."""
    topo, idx, rack_ids, room_ids = hpc
    with capsys.disabled():
        print(f"\n{'=' * 52}")
        print("  Topology : hpc-cluster")
        print(f"  Sites    : {len(topo.sites)}")
        print(f"  Rooms    : {len(room_ids)}")
        print(f"  Racks    : {len(rack_ids)}")
        print(f"  Instances: {len(idx.instances):,}")
        print(f"{'=' * 52}")
