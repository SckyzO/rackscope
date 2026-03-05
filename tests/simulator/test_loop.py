"""
Unit tests for plugins.simulator.process.loop module.

Tests cover: _apply_failures, _apply_overrides, _roll_incidents, _get_cycle_ticks,
and the helper sub-functions of simulate() that can be tested in isolation.
"""

from plugins.simulator.process.loop import (
    _apply_failures,
    _apply_overrides,
    _get_cycle_ticks,
    _roll_incidents,
)


class TestApplyOverrides:
    def test_matching_override_forces_value(self):
        targets = [{"instance": "compute001", "rack_id": "rack-01", "metrics": {"up": 1.0}}]
        overrides = [{"instance": "compute001", "metric": "up", "value": 0.0}]
        _apply_overrides(targets, overrides)
        assert targets[0]["metrics"]["up"] == 0.0

    def test_non_matching_instance_unchanged(self):
        targets = [{"instance": "compute001", "rack_id": "rack-01", "metrics": {"up": 1.0}}]
        overrides = [{"instance": "compute002", "metric": "up", "value": 0.0}]
        _apply_overrides(targets, overrides)
        assert targets[0]["metrics"]["up"] == 1.0

    def test_non_matching_metric_unchanged(self):
        targets = [{"instance": "compute001", "rack_id": "rack-01", "metrics": {"up": 1.0}}]
        overrides = [{"instance": "compute001", "metric": "temperature", "value": 99.0}]
        _apply_overrides(targets, overrides)
        assert targets[0]["metrics"]["up"] == 1.0

    def test_empty_overrides_no_change(self):
        targets = [{"instance": "n1", "rack_id": "r1", "metrics": {"up": 1.0}}]
        _apply_overrides(targets, [])
        assert targets[0]["metrics"]["up"] == 1.0

    def test_multiple_overrides_applied(self):
        targets = [{"instance": "n1", "rack_id": "r1", "metrics": {"up": 1.0, "temp": 30.0}}]
        overrides = [
            {"instance": "n1", "metric": "up", "value": 0.0},
            {"instance": "n1", "metric": "temp", "value": 99.0},
        ]
        _apply_overrides(targets, overrides)
        assert targets[0]["metrics"]["up"] == 0.0
        assert targets[0]["metrics"]["temp"] == 99.0


class TestApplyFailures:
    def test_empty_incident_state_no_changes(self):
        targets = [
            {"node_id": "n1", "rack_id": "r1", "metrics": {"up": 1.0}},
            {"node_id": "n2", "rack_id": "r1", "metrics": {"up": 1.0}},
        ]
        _apply_failures(targets, {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": set()})
        assert all(t["metrics"]["up"] == 1.0 for t in targets)

    def test_nodes_crit_sets_up_to_zero(self):
        targets = [{"node_id": f"n{i}", "rack_id": "r1", "metrics": {"up": 1.0}} for i in range(5)]
        incident_state = {
            "nodes_crit": {"n0", "n1", "n2", "n3", "n4"},
            "nodes_warn": set(),
            "racks_crit": set(),
        }
        _apply_failures(targets, incident_state)
        assert all(t["metrics"]["up"] == 0.0 for t in targets)

    def test_rack_crit_marks_all_rack_nodes_down(self):
        targets = [
            {"node_id": "n1", "rack_id": "rack-01", "metrics": {"up": 1.0}},
            {"node_id": "n2", "rack_id": "rack-01", "metrics": {"up": 1.0}},
            {"node_id": "n3", "rack_id": "rack-02", "metrics": {"up": 1.0}},
        ]
        incident_state = {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": {"rack-01"}}
        _apply_failures(targets, incident_state)
        assert targets[0]["metrics"]["up"] == 0.0
        assert targets[1]["metrics"]["up"] == 0.0
        assert targets[2]["metrics"]["up"] == 1.0

    def test_nodes_warn_sets_health_status(self):
        targets = [{"node_id": "n1", "rack_id": "r1", "metrics": {"up": 1.0, "node_health_status": 0.0}}]
        incident_state = {"nodes_crit": set(), "nodes_warn": {"n1"}, "racks_crit": set()}
        _apply_failures(targets, incident_state)
        assert targets[0]["metrics"]["up"] == 1.0
        assert targets[0]["metrics"]["node_health_status"] == 1.0

    def test_multiple_incident_types_combined(self):
        targets = [
            {"node_id": "n1", "rack_id": "rack-01", "metrics": {"up": 1.0, "node_health_status": 0.0}},
            {"node_id": "n2", "rack_id": "rack-02", "metrics": {"up": 1.0, "node_health_status": 0.0}},
            {"node_id": "n3", "rack_id": "rack-02", "metrics": {"up": 1.0, "node_health_status": 0.0}},
        ]
        incident_state = {
            "nodes_crit": {"n1"},
            "nodes_warn": {"n2"},
            "racks_crit": set(),
        }
        _apply_failures(targets, incident_state)
        assert targets[0]["metrics"]["up"] == 0.0
        assert targets[1]["metrics"]["node_health_status"] == 1.0
        assert targets[1]["metrics"]["up"] == 1.0
        assert targets[2]["metrics"]["up"] == 1.0

    def test_empty_targets_no_crash(self):
        _apply_failures([], {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": set()})

    def test_missing_metrics_key_no_crash(self):
        targets = [{"node_id": "n1", "rack_id": "r1"}]
        _apply_failures(targets, {"nodes_crit": {"n1"}, "nodes_warn": set(), "racks_crit": set()})


class TestGetCycleTicks:
    def test_basic_calculation(self):
        # 1 change/h, 20s interval → 3600/1/20 = 180 ticks
        assert _get_cycle_ticks(1, 20) == 180

    def test_two_changes_per_hour(self):
        # 2 changes/h, 20s interval → 3600/2/20 = 90 ticks
        assert _get_cycle_ticks(2, 20) == 90

    def test_floor_minimum_one(self):
        # Very high changes_per_hour → result floored to 1
        assert _get_cycle_ticks(10000, 20) == 1

    def test_zero_guards_no_crash(self):
        # Both args are max(1, ...) guarded — no ZeroDivisionError, result is positive
        result = _get_cycle_ticks(0, 0)
        assert isinstance(result, int) and result >= 1


class TestRollIncidents:
    def _make_targets(self, n_nodes=10):
        return [{"node_id": f"n{i}", "rack_id": f"r{i % 3}", "aisle_id": f"a{i % 2}"} for i in range(n_nodes)]

    def test_full_ok_returns_empty_sets(self):
        targets = self._make_targets()
        result = _roll_incidents(targets, {"incident_mode": "full_ok"}, {"r0", "r1"}, {"a0"})
        assert result["nodes_crit"] == set()
        assert result["nodes_warn"] == set()
        assert result["racks_crit"] == set()
        assert result["aisles_hot"] == set()

    def test_light_crit_within_1_3(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i % 3}" for i in range(20)}
        aisle_ids = {f"a{i % 2}" for i in range(20)}
        results = [_roll_incidents(targets, {"incident_mode": "light"}, rack_ids, aisle_ids) for _ in range(30)]
        crit_counts = [len(r["nodes_crit"]) for r in results]
        assert all(1 <= c <= 3 for c in crit_counts), f"Out of range: {crit_counts}"

    def test_light_warn_within_1_5(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i % 3}" for i in range(20)}
        aisle_ids = {f"a{i % 2}" for i in range(20)}
        results = [_roll_incidents(targets, {"incident_mode": "light"}, rack_ids, aisle_ids) for _ in range(30)]
        warn_counts = [len(r["nodes_warn"]) for r in results]
        assert all(1 <= w <= 5 for w in warn_counts), f"Out of range: {warn_counts}"

    def test_medium_has_exactly_one_rack(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1"}
        result = _roll_incidents(targets, {"incident_mode": "medium"}, rack_ids, aisle_ids)
        assert len(result["racks_crit"]) == 1

    def test_heavy_has_two_racks_and_one_aisle(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1", "a2"}
        result = _roll_incidents(targets, {"incident_mode": "heavy"}, rack_ids, aisle_ids)
        assert len(result["racks_crit"]) == 2
        assert len(result["aisles_hot"]) == 1

    def test_chaos_crit_is_15_percent(self):
        targets = self._make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert len(result["nodes_crit"]) == 15

    def test_chaos_warn_is_25_percent(self):
        targets = self._make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert len(result["nodes_warn"]) == 25

    def test_chaos_no_overlap_between_crit_and_warn(self):
        targets = self._make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert result["nodes_crit"].isdisjoint(result["nodes_warn"])

    def test_custom_uses_exact_counts(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1"}
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 5, "devices_warn": 3, "racks_crit": 2, "aisles_hot": 1},
        }
        result = _roll_incidents(targets, sim_cfg, rack_ids, aisle_ids)
        assert len(result["nodes_crit"]) == 5
        assert len(result["nodes_warn"]) == 3
        assert len(result["racks_crit"]) == 2
        assert len(result["aisles_hot"]) == 1

    def test_unknown_mode_falls_back_to_light(self):
        targets = self._make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1"}
        # "random-demo" is not a known mode, should fall back to light preset
        result = _roll_incidents(targets, {"incident_mode": "random-demo"}, rack_ids, aisle_ids)
        # light preset: crit 1-3, warn 1-5, racks 0 → just check no crash + racks_crit == 0
        assert len(result["racks_crit"]) == 0
