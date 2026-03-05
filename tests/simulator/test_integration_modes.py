"""
Integration tests: incident modes on the REAL topology.

These tests load the actual config/topology files to validate that each
incident mode produces counts within the documented bounds across many rolls.
They also verify that _generate_node_metrics and _generate_rack_metrics
behave correctly end-to-end when given the rolled incident state.

Topology (as of writing): 256 nodes · 13 racks · 3 aisles
"""

import random

import pytest

from plugins.simulator.process.loop import (
    INCIDENT_PRESETS,
    _generate_node_metrics,
    _generate_rack_metrics,
    _roll_incidents,
)
from plugins.simulator.process.topology import (
    load_device_templates,
    load_topology_data,
    load_topology_nodes,
)

# ── Real topology fixture ──────────────────────────────────────────────────

TOPOLOGY_PATH = "/app/config/topology"
TEMPLATES_PATH = "/app/config/templates"
ROLLS = 50  # number of independent rolls per mode


@pytest.fixture(scope="module")
def real_topology():
    """Load the actual topology once for the whole module."""
    topo = load_topology_data(TOPOLOGY_PATH)
    templates = load_device_templates(TEMPLATES_PATH)
    targets = load_topology_nodes(topo, templates)
    assert len(targets) > 0, "Topology must not be empty"
    rack_ids = {t["rack_id"] for t in targets}
    aisle_ids = {t["aisle_id"] for t in targets}
    return {
        "targets": targets,
        "node_ids": {t["node_id"] for t in targets},
        "rack_ids": rack_ids,
        "aisle_ids": aisle_ids,
        "n_nodes": len(targets),
        "n_racks": len(rack_ids),
        "n_aisles": len(aisle_ids),
    }


# ── Helpers ────────────────────────────────────────────────────────────────


def roll_many(targets, sim_cfg, rack_ids, aisle_ids, n=ROLLS):
    """Run _roll_incidents n times and return list of result dicts."""
    return [_roll_incidents(targets, sim_cfg, rack_ids, aisle_ids) for _ in range(n)]


def assert_bounds(results, key, lo, hi, mode):
    counts = [len(r[key]) for r in results]
    assert all(lo <= c <= hi for c in counts), (
        f"mode={mode} {key}: got {sorted(set(counts))}, expected [{lo}, {hi}]"
    )


def assert_no_overlap(results, mode):
    for r in results:
        assert r["nodes_crit"].isdisjoint(r["nodes_warn"]), (
            f"mode={mode}: crit ∩ warn ≠ ∅ — overlap: {r['nodes_crit'] & r['nodes_warn']}"
        )


def assert_known_ids(results, node_ids, rack_ids, aisle_ids, mode):
    for r in results:
        assert r["nodes_crit"].issubset(node_ids), f"mode={mode}: unknown crit node"
        assert r["nodes_warn"].issubset(node_ids), f"mode={mode}: unknown warn node"
        assert r["racks_crit"].issubset(rack_ids), f"mode={mode}: unknown crit rack"
        assert r["aisles_hot"].issubset(aisle_ids), f"mode={mode}: unknown hot aisle"


# ── Mode: full_ok ──────────────────────────────────────────────────────────


class TestModeFullOk:
    def test_always_zero_crit(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "full_ok"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", 0, 0, "full_ok")

    def test_always_zero_warn(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "full_ok"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", 0, 0, "full_ok")

    def test_no_racks_or_aisles(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "full_ok"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", 0, 0, "full_ok")
        assert_bounds(results, "aisles_hot", 0, 0, "full_ok")

    def test_node_metrics_all_up(self, real_topology):
        """With full_ok, every node must have up=1."""
        state = _roll_incidents(
            real_topology["targets"], {"incident_mode": "full_ok"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        for t in real_topology["targets"][:20]:  # sample first 20
            vals = _generate_node_metrics(t, {}, state, {}, {}, tick=1, update_interval=20)
            assert vals["up_val"] == 1, f"Expected up=1 for {t['node_id']} in full_ok"
            assert vals["is_down"] is False


# ── Mode: light ────────────────────────────────────────────────────────────


class TestModeLight:
    def test_crit_within_1_3(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", 1, 3, "light")

    def test_warn_within_1_5(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", 1, 5, "light")

    def test_no_rack_incidents(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", 0, 0, "light")

    def test_no_overlap(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_no_overlap(results, "light")

    def test_ids_from_topology(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_known_ids(
            results, real_topology["node_ids"],
            real_topology["rack_ids"], real_topology["aisle_ids"], "light"
        )

    def test_crit_nodes_produce_up_zero(self, real_topology):
        """Nodes in nodes_crit must have up=0 in _generate_node_metrics."""
        random.seed(42)
        state = _roll_incidents(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        crit_targets = [t for t in real_topology["targets"] if t["node_id"] in state["nodes_crit"]]
        for t in crit_targets:
            vals = _generate_node_metrics(t, {}, state, {}, {}, tick=1, update_interval=20)
            assert vals["up_val"] == 0, f"Crit node {t['node_id']} must have up=0"
            assert vals["status"] == 2

    def test_warn_nodes_have_status_1(self, real_topology):
        """Nodes in nodes_warn must have status >= 1 in _generate_node_metrics."""
        random.seed(42)
        state = _roll_incidents(
            real_topology["targets"], {"incident_mode": "light"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        warn_targets = [t for t in real_topology["targets"] if t["node_id"] in state["nodes_warn"]]
        for t in warn_targets:
            vals = _generate_node_metrics(t, {}, state, {}, {}, tick=1, update_interval=20)
            assert vals["up_val"] == 1, f"Warn node {t['node_id']} must have up=1"
            assert vals["status"] >= 1, f"Warn node {t['node_id']} must have status >= 1"


# ── Mode: medium ───────────────────────────────────────────────────────────


class TestModeMedium:
    def test_crit_within_1_3(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", 1, 3, "medium")

    def test_warn_within_5_10(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", 5, 10, "medium")

    def test_exactly_one_rack(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", 1, 1, "medium")

    def test_no_aisle_incidents(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "aisles_hot", 0, 0, "medium")

    def test_no_overlap(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_no_overlap(results, "medium")

    def test_rack_crit_nodes_are_down(self, real_topology):
        """All nodes belonging to the crit rack must have up=0."""
        random.seed(7)
        state = _roll_incidents(
            real_topology["targets"], {"incident_mode": "medium"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert len(state["racks_crit"]) == 1
        crit_rack = next(iter(state["racks_crit"]))
        rack_targets = [t for t in real_topology["targets"] if t["rack_id"] == crit_rack]
        for t in rack_targets:
            vals = _generate_node_metrics(t, {}, state, {}, {}, tick=1, update_interval=20)
            assert vals["up_val"] == 0, (
                f"Node {t['node_id']} in crit rack {crit_rack} must have up=0"
            )


# ── Mode: heavy ────────────────────────────────────────────────────────────


class TestModeHeavy:
    def test_crit_within_5_10(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", 5, 10, "heavy")

    def test_warn_within_10_20(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", 10, 20, "heavy")

    def test_exactly_two_racks(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", 2, 2, "heavy")

    def test_exactly_one_aisle(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "aisles_hot", 1, 1, "heavy")

    def test_no_overlap(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_no_overlap(results, "heavy")

    def test_hot_aisle_raises_rack_temperature(self, real_topology):
        """Racks in hot aisle must have elevated board_temp in _generate_rack_metrics."""
        random.seed(99)
        state = _roll_incidents(
            real_topology["targets"], {"incident_mode": "heavy"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert len(state["aisles_hot"]) == 1
        hot_aisle = next(iter(state["aisles_hot"]))

        rack_info = {
            t["rack_id"]: {
                "site_id": t.get("site_id", ""),
                "room_id": t.get("room_id", ""),
                "aisle_id": t["aisle_id"],
            }
            for t in real_topology["targets"]
        }
        hot_racks = [r for r, info in rack_info.items() if info["aisle_id"] == hot_aisle]
        if hot_racks:
            rack_id = hot_racks[0]
            normal = _generate_rack_metrics(rack_id, rack_info, {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": set(), "aisles_hot": set()}, {}, tick=1)
            hot = _generate_rack_metrics(rack_id, rack_info, state, {}, tick=1)
            assert hot["cooling"]["board_temp"] > normal["cooling"]["board_temp"]


# ── Mode: chaos ────────────────────────────────────────────────────────────


class TestModeChaos:
    def test_crit_is_15_percent(self, real_topology):
        n = real_topology["n_nodes"]
        expected = int(n * INCIDENT_PRESETS["chaos"]["crit_pct"])
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", expected, expected, "chaos")

    def test_warn_is_25_percent(self, real_topology):
        n = real_topology["n_nodes"]
        expected = int(n * INCIDENT_PRESETS["chaos"]["warn_pct"])
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", expected, expected, "chaos")

    def test_racks_is_20_percent(self, real_topology):
        n = real_topology["n_racks"]
        expected = int(n * INCIDENT_PRESETS["chaos"]["racks_pct"])
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", expected, expected, "chaos")

    def test_aisles_is_25_percent(self, real_topology):
        n = real_topology["n_aisles"]
        expected = int(n * INCIDENT_PRESETS["chaos"]["aisles_pct"])
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "aisles_hot", expected, expected, "chaos")

    def test_no_overlap(self, real_topology):
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_no_overlap(results, "chaos")

    def test_different_victims_each_roll(self, real_topology):
        """Chaos should produce different victims on each roll (probabilistic)."""
        results = roll_many(
            real_topology["targets"], {"incident_mode": "chaos"},
            real_topology["rack_ids"], real_topology["aisle_ids"], n=10
        )
        unique_crit_sets = {frozenset(r["nodes_crit"]) for r in results}
        # With 256 nodes, probability of hitting the same 38 twice is negligible
        assert len(unique_crit_sets) > 1, "All rolls produced identical crit sets"


# ── Mode: custom ───────────────────────────────────────────────────────────


class TestModeCustom:
    def test_exact_crit_count(self, real_topology):
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 5, "devices_warn": 5, "racks_crit": 2, "aisles_hot": 1},
        }
        results = roll_many(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_crit", 5, 5, "custom(5)")

    def test_exact_warn_count(self, real_topology):
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 5, "devices_warn": 5, "racks_crit": 2, "aisles_hot": 1},
        }
        results = roll_many(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "nodes_warn", 5, 5, "custom(5)")

    def test_exact_rack_count(self, real_topology):
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 0, "devices_warn": 0, "racks_crit": 3, "aisles_hot": 0},
        }
        results = roll_many(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_bounds(results, "racks_crit", 3, 3, "custom(racks=3)")

    def test_zero_counts_produces_empty(self, real_topology):
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 0, "devices_warn": 0, "racks_crit": 0, "aisles_hot": 0},
        }
        results = roll_many(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        for key in ("nodes_crit", "nodes_warn", "racks_crit", "aisles_hot"):
            assert_bounds(results, key, 0, 0, "custom(zeros)")

    def test_no_overlap(self, real_topology):
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 10, "devices_warn": 10, "racks_crit": 0, "aisles_hot": 0},
        }
        results = roll_many(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert_no_overlap(results, "custom")

    def test_custom_nodes_metric_up_zero(self, real_topology):
        """5 custom crit nodes must all produce up=0 via _generate_node_metrics."""
        random.seed(1)
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 5, "devices_warn": 0, "racks_crit": 0, "aisles_hot": 0},
        }
        state = _roll_incidents(
            real_topology["targets"], sim_cfg,
            real_topology["rack_ids"], real_topology["aisle_ids"]
        )
        assert len(state["nodes_crit"]) == 5
        crit_targets = [t for t in real_topology["targets"] if t["node_id"] in state["nodes_crit"]]
        for t in crit_targets:
            vals = _generate_node_metrics(t, {}, state, {}, {}, tick=1, update_interval=20)
            assert vals["up_val"] == 0


# ── Cross-mode property tests ──────────────────────────────────────────────


class TestCrossModeProperties:
    """Properties that must hold across ALL modes."""

    MODES = ["full_ok", "light", "medium", "heavy", "chaos"]

    def test_no_overlap_all_modes(self, real_topology):
        for mode in self.MODES:
            results = roll_many(
                real_topology["targets"], {"incident_mode": mode},
                real_topology["rack_ids"], real_topology["aisle_ids"], n=20
            )
            assert_no_overlap(results, mode)

    def test_ids_from_topology_all_modes(self, real_topology):
        for mode in self.MODES:
            results = roll_many(
                real_topology["targets"], {"incident_mode": mode},
                real_topology["rack_ids"], real_topology["aisle_ids"], n=20
            )
            assert_known_ids(
                results, real_topology["node_ids"],
                real_topology["rack_ids"], real_topology["aisle_ids"], mode
            )

    def test_severity_ordering(self, real_topology):
        """More severe modes must produce more (or equal) incidents on average."""
        def avg_crit(mode):
            results = roll_many(
                real_topology["targets"], {"incident_mode": mode},
                real_topology["rack_ids"], real_topology["aisle_ids"], n=30
            )
            return sum(len(r["nodes_crit"]) for r in results) / len(results)

        avg_full_ok = avg_crit("full_ok")
        avg_light = avg_crit("light")
        avg_heavy = avg_crit("heavy")
        avg_chaos = avg_crit("chaos")

        assert avg_full_ok == 0
        assert avg_light > avg_full_ok
        assert avg_heavy > avg_light
        assert avg_chaos > avg_heavy
