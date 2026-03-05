"""
Unit tests for plugins.simulator.process.loop module.

Tests cover: _apply_failures, _apply_overrides, _roll_incidents,
_get_cycle_ticks, _generate_node_metrics, _generate_rack_metrics.
"""

from plugins.simulator.process.loop import (
    _apply_failures,
    _apply_overrides,
    _generate_node_metrics,
    _generate_rack_metrics,
    _get_cycle_ticks,
    _roll_incidents,
)

# ── Helpers ────────────────────────────────────────────────────────────────


def _target(node_id="compute001", aisle_id="aisle-01", rack_id="rack-01"):
    return {"node_id": node_id, "aisle_id": aisle_id, "rack_id": rack_id}


def _state(**kwargs):
    """Build an incident_state dict. All sets default to empty."""
    return {
        "nodes_crit": kwargs.get("nodes_crit", set()),
        "nodes_warn": kwargs.get("nodes_warn", set()),
        "racks_crit": kwargs.get("racks_crit", set()),
        "aisles_hot": kwargs.get("aisles_hot", set()),
    }


def _make_targets(n=10):
    return [
        {"node_id": f"n{i}", "rack_id": f"r{i % 3}", "aisle_id": f"a{i % 2}"}
        for i in range(n)
    ]


# ── TestApplyOverrides ─────────────────────────────────────────────────────


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


# ── TestApplyFailures ──────────────────────────────────────────────────────


class TestApplyFailures:
    def test_empty_incident_state_no_changes(self):
        targets = [
            {"node_id": "n1", "rack_id": "r1", "metrics": {"up": 1.0}},
            {"node_id": "n2", "rack_id": "r1", "metrics": {"up": 1.0}},
        ]
        _apply_failures(targets, _state())
        assert all(t["metrics"]["up"] == 1.0 for t in targets)

    def test_nodes_crit_sets_up_to_zero(self):
        targets = [{"node_id": f"n{i}", "rack_id": "r1", "metrics": {"up": 1.0}} for i in range(5)]
        _apply_failures(targets, _state(nodes_crit={f"n{i}" for i in range(5)}))
        assert all(t["metrics"]["up"] == 0.0 for t in targets)

    def test_rack_crit_marks_all_rack_nodes_down(self):
        targets = [
            {"node_id": "n1", "rack_id": "rack-01", "metrics": {"up": 1.0}},
            {"node_id": "n2", "rack_id": "rack-01", "metrics": {"up": 1.0}},
            {"node_id": "n3", "rack_id": "rack-02", "metrics": {"up": 1.0}},
        ]
        _apply_failures(targets, _state(racks_crit={"rack-01"}))
        assert targets[0]["metrics"]["up"] == 0.0
        assert targets[1]["metrics"]["up"] == 0.0
        assert targets[2]["metrics"]["up"] == 1.0

    def test_nodes_warn_sets_health_status(self):
        targets = [
            {"node_id": "n1", "rack_id": "r1", "metrics": {"up": 1.0, "node_health_status": 0.0}}
        ]
        _apply_failures(targets, _state(nodes_warn={"n1"}))
        assert targets[0]["metrics"]["up"] == 1.0
        assert targets[0]["metrics"]["node_health_status"] == 1.0

    def test_multiple_incident_types_combined(self):
        targets = [
            {"node_id": "n1", "rack_id": "rack-01", "metrics": {"up": 1.0, "node_health_status": 0.0}},
            {"node_id": "n2", "rack_id": "rack-02", "metrics": {"up": 1.0, "node_health_status": 0.0}},
            {"node_id": "n3", "rack_id": "rack-02", "metrics": {"up": 1.0, "node_health_status": 0.0}},
        ]
        _apply_failures(targets, _state(nodes_crit={"n1"}, nodes_warn={"n2"}))
        assert targets[0]["metrics"]["up"] == 0.0
        assert targets[1]["metrics"]["node_health_status"] == 1.0
        assert targets[1]["metrics"]["up"] == 1.0
        assert targets[2]["metrics"]["up"] == 1.0

    def test_crit_takes_priority_over_warn_for_same_node(self):
        """A node that is both in nodes_crit and nodes_warn should be treated as crit."""
        targets = [{"node_id": "n1", "rack_id": "r1", "metrics": {"up": 1.0}}]
        _apply_failures(targets, _state(nodes_crit={"n1"}, nodes_warn={"n1"}))
        assert targets[0]["metrics"]["up"] == 0.0

    def test_rack_crit_beats_node_warn(self):
        """If a node's rack is in racks_crit, it should be down even if node is in nodes_warn."""
        targets = [{"node_id": "n1", "rack_id": "rack-01", "metrics": {"up": 1.0}}]
        _apply_failures(targets, _state(nodes_warn={"n1"}, racks_crit={"rack-01"}))
        assert targets[0]["metrics"]["up"] == 0.0

    def test_empty_targets_no_crash(self):
        _apply_failures([], _state())

    def test_missing_metrics_key_no_crash(self):
        targets = [{"node_id": "n1", "rack_id": "r1"}]
        _apply_failures(targets, _state(nodes_crit={"n1"}))


# ── TestGetCycleTicks ──────────────────────────────────────────────────────


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

    def test_proportional_to_interval(self):
        # Doubling interval halves tick count
        ticks_20 = _get_cycle_ticks(2, 20)
        ticks_40 = _get_cycle_ticks(2, 40)
        assert ticks_40 == ticks_20 // 2


# ── TestRollIncidents ──────────────────────────────────────────────────────


class TestRollIncidents:
    def test_full_ok_returns_empty_sets(self):
        targets = _make_targets()
        result = _roll_incidents(targets, {"incident_mode": "full_ok"}, {"r0", "r1"}, {"a0"})
        assert result["nodes_crit"] == set()
        assert result["nodes_warn"] == set()
        assert result["racks_crit"] == set()
        assert result["aisles_hot"] == set()

    def test_light_crit_within_1_3(self):
        targets = _make_targets(20)
        rack_ids = {f"r{i % 3}" for i in range(20)}
        aisle_ids = {f"a{i % 2}" for i in range(20)}
        results = [
            _roll_incidents(targets, {"incident_mode": "light"}, rack_ids, aisle_ids)
            for _ in range(30)
        ]
        crit_counts = [len(r["nodes_crit"]) for r in results]
        assert all(1 <= c <= 3 for c in crit_counts), f"Out of range: {crit_counts}"

    def test_light_warn_within_1_5(self):
        targets = _make_targets(20)
        rack_ids = {f"r{i % 3}" for i in range(20)}
        aisle_ids = {f"a{i % 2}" for i in range(20)}
        results = [
            _roll_incidents(targets, {"incident_mode": "light"}, rack_ids, aisle_ids)
            for _ in range(30)
        ]
        warn_counts = [len(r["nodes_warn"]) for r in results]
        assert all(1 <= w <= 5 for w in warn_counts), f"Out of range: {warn_counts}"

    def test_medium_has_exactly_one_rack(self):
        targets = _make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1"}
        result = _roll_incidents(targets, {"incident_mode": "medium"}, rack_ids, aisle_ids)
        assert len(result["racks_crit"]) == 1

    def test_heavy_has_two_racks_and_one_aisle(self):
        targets = _make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1", "a2"}
        result = _roll_incidents(targets, {"incident_mode": "heavy"}, rack_ids, aisle_ids)
        assert len(result["racks_crit"]) == 2
        assert len(result["aisles_hot"]) == 1

    def test_chaos_crit_is_15_percent(self):
        targets = _make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert len(result["nodes_crit"]) == 15

    def test_chaos_warn_is_25_percent(self):
        targets = _make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert len(result["nodes_warn"]) == 25

    def test_chaos_no_overlap_between_crit_and_warn(self):
        targets = _make_targets(100)
        rack_ids = {f"r{i}" for i in range(10)}
        aisle_ids = {f"a{i}" for i in range(4)}
        result = _roll_incidents(targets, {"incident_mode": "chaos"}, rack_ids, aisle_ids)
        assert result["nodes_crit"].isdisjoint(result["nodes_warn"])

    def test_custom_uses_exact_counts(self):
        targets = _make_targets(20)
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
        targets = _make_targets(20)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {"a0", "a1"}
        result = _roll_incidents(targets, {"incident_mode": "random-demo"}, rack_ids, aisle_ids)
        # light preset: racks=0, so racks_crit must be empty
        assert len(result["racks_crit"]) == 0

    def test_no_overlap_crit_warn_in_all_presets(self):
        """crit and warn node sets must never overlap in any preset."""
        targets = _make_targets(30)
        rack_ids = {f"r{i}" for i in range(5)}
        aisle_ids = {f"a{i}" for i in range(3)}
        for mode in ("light", "medium", "heavy", "chaos"):
            result = _roll_incidents(targets, {"incident_mode": mode}, rack_ids, aisle_ids)
            assert result["nodes_crit"].isdisjoint(result["nodes_warn"]), (
                f"mode={mode}: overlap between crit and warn"
            )

    def test_crit_warn_subsets_of_known_nodes(self):
        """Rolled node IDs must all come from the topology."""
        targets = _make_targets(20)
        all_node_ids = {t["node_id"] for t in targets}
        rack_ids = {f"r{i}" for i in range(3)}
        aisle_ids = {f"a{i}" for i in range(2)}
        for mode in ("light", "medium", "heavy", "chaos", "custom"):
            sim_cfg = {
                "incident_mode": mode,
                "custom_incidents": {"devices_crit": 3, "devices_warn": 3, "racks_crit": 1, "aisles_hot": 1},
            }
            result = _roll_incidents(targets, sim_cfg, rack_ids, aisle_ids)
            assert result["nodes_crit"].issubset(all_node_ids), f"mode={mode}: unknown crit node"
            assert result["nodes_warn"].issubset(all_node_ids), f"mode={mode}: unknown warn node"
            assert result["racks_crit"].issubset(rack_ids), f"mode={mode}: unknown crit rack"
            assert result["aisles_hot"].issubset(aisle_ids), f"mode={mode}: unknown hot aisle"

    def test_custom_clamps_to_available_nodes(self):
        """custom mode must not fail when counts exceed topology size."""
        targets = _make_targets(3)
        rack_ids = {"r0"}
        aisle_ids = {"a0"}
        sim_cfg = {
            "incident_mode": "custom",
            "custom_incidents": {"devices_crit": 100, "devices_warn": 100, "racks_crit": 10, "aisles_hot": 10},
        }
        result = _roll_incidents(targets, sim_cfg, rack_ids, aisle_ids)
        # Must not exceed available counts, and no crash
        assert len(result["nodes_crit"]) <= 3
        assert len(result["nodes_warn"]) <= 3  # crit takes first, warn gets rest
        assert len(result["racks_crit"]) <= 1
        assert len(result["aisles_hot"]) <= 1

    def test_heavy_clamps_when_fewer_racks_than_preset(self):
        """heavy needs 2 racks; if only 1 available, must not crash."""
        targets = _make_targets(10)
        rack_ids = {"r0"}  # only 1 rack
        aisle_ids = {"a0", "a1", "a2"}
        result = _roll_incidents(targets, {"incident_mode": "heavy"}, rack_ids, aisle_ids)
        assert len(result["racks_crit"]) <= 1

    def test_empty_topology_returns_empty_sets(self):
        """Simulate with no nodes/racks/aisles — must not crash."""
        result = _roll_incidents([], {"incident_mode": "chaos"}, set(), set())
        assert result == {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": set(), "aisles_hot": set()}

    def test_full_ok_ignores_custom_incidents(self):
        """full_ok always returns empty sets regardless of custom_incidents."""
        sim_cfg = {
            "incident_mode": "full_ok",
            "custom_incidents": {"devices_crit": 99, "devices_warn": 99, "racks_crit": 99, "aisles_hot": 99},
        }
        targets = _make_targets(20)
        result = _roll_incidents(targets, sim_cfg, {f"r{i}" for i in range(5)}, {"a0", "a1"})
        assert result["nodes_crit"] == set()
        assert result["nodes_warn"] == set()


# ── TestGenerateNodeMetrics ────────────────────────────────────────────────


class TestGenerateNodeMetrics:
    """Test _generate_node_metrics with various incident states."""

    _profiles = {}  # empty → uses hardcoded defaults

    def _call(self, target, incident_state, overrides_by_rack=None):
        return _generate_node_metrics(
            target,
            self._profiles,
            incident_state,
            {},  # overrides_by_instance
            overrides_by_rack or {},
            tick=1,
            update_interval=20,
        )

    def test_healthy_node_is_up(self):
        vals = self._call(_target(), _state())
        assert vals["up_val"] == 1
        assert vals["is_down"] is False

    def test_node_in_crit_is_down(self):
        target = _target(node_id="compute001")
        vals = self._call(target, _state(nodes_crit={"compute001"}))
        assert vals["up_val"] == 0
        assert vals["is_down"] is True
        assert vals["status"] == 2

    def test_node_in_warn_has_status_1(self):
        target = _target(node_id="compute001")
        vals = self._call(target, _state(nodes_warn={"compute001"}))
        assert vals["up_val"] == 1
        assert vals["is_down"] is False
        assert vals["status"] >= 1

    def test_rack_crit_brings_node_down(self):
        target = _target(node_id="compute001", rack_id="rack-01")
        vals = self._call(target, _state(racks_crit={"rack-01"}))
        assert vals["up_val"] == 0
        assert vals["is_down"] is True

    def test_aisle_hot_raises_temperature(self):
        target = _target(node_id="compute001", aisle_id="aisle-01")
        normal = self._call(target, _state())
        hot = self._call(target, _state(aisles_hot={"aisle-01"}))
        # Temperature should be ~12°C higher in hot aisle
        assert hot["temp"] > normal["temp"] + 10

    def test_down_node_has_zero_load_and_reduced_power(self):
        target = _target(node_id="compute001", rack_id="rack-01")
        vals = self._call(target, _state(racks_crit={"rack-01"}))
        assert vals["final_load"] == 0
        assert vals["power"] < 100  # reduced to standby (~50W)

    def test_warn_node_is_not_down(self):
        target = _target(node_id="compute001", rack_id="rack-01")
        vals = self._call(
            target, _state(nodes_warn={"compute001"}, racks_crit=set())
        )
        assert vals["up_val"] == 1

    def test_rack_crit_overrides_node_warn(self):
        """Node in nodes_warn whose rack is in racks_crit → should be down."""
        target = _target(node_id="compute001", rack_id="rack-01")
        vals = self._call(target, _state(nodes_warn={"compute001"}, racks_crit={"rack-01"}))
        assert vals["up_val"] == 0
        assert vals["is_down"] is True

    def test_rack_down_override_brings_node_down(self):
        """rack_down override in overrides_by_rack should force is_down=True."""
        target = _target(node_id="compute001", rack_id="rack-01")
        overrides_by_rack = {"rack-01": [{"metric": "rack_down", "value": 1}]}
        vals = self._call(target, _state(), overrides_by_rack=overrides_by_rack)
        assert vals["is_down"] is True

    def test_different_racks_independent(self):
        """Only the rack in racks_crit is affected; other racks are fine."""
        target_down = _target(node_id="n1", rack_id="rack-01")
        target_ok = _target(node_id="n2", rack_id="rack-02")
        state = _state(racks_crit={"rack-01"})
        vals_down = self._call(target_down, state)
        vals_ok = self._call(target_ok, state)
        assert vals_down["is_down"] is True
        assert vals_ok["is_down"] is False


# ── TestGenerateRackMetrics ────────────────────────────────────────────────


class TestGenerateRackMetrics:
    """Test _generate_rack_metrics with various incident states."""

    _rack_info = {
        "rack-01": {"site_id": "site1", "room_id": "room1", "aisle_id": "aisle-01"},
        "rack-02": {"site_id": "site1", "room_id": "room1", "aisle_id": "aisle-02"},
    }

    def _call(self, rack_id, incident_state, overrides_by_rack=None):
        return _generate_rack_metrics(
            rack_id,
            self._rack_info,
            incident_state,
            overrides_by_rack or {},
            tick=1,
        )

    def test_healthy_rack_normal_values(self):
        result = self._call("rack-01", _state())
        assert result["is_rack_down"] is False
        c = result["cooling"]
        assert 190 <= c["pressure"] <= 210
        assert c["leak"] == 0.0
        assert 55 <= c["board_temp"] <= 65

    def test_rack_in_racks_crit_is_down(self):
        result = self._call("rack-01", _state(racks_crit={"rack-01"}))
        assert result["is_rack_down"] is True

    def test_rack_crit_leak_is_high(self):
        result = self._call("rack-01", _state(racks_crit={"rack-01"}))
        assert result["cooling"]["leak"] > 1.0

    def test_rack_crit_pressure_is_low(self):
        result = self._call("rack-01", _state(racks_crit={"rack-01"}))
        assert result["cooling"]["pressure"] < 165

    def test_rack_crit_board_temp_is_elevated(self):
        result = self._call("rack-01", _state(racks_crit={"rack-01"}))
        assert result["cooling"]["board_temp"] > 90

    def test_rack_crit_pmc_power_is_zero(self):
        result = self._call("rack-01", _state(racks_crit={"rack-01"}))
        assert result["cooling"]["pmc_power"] == 0.0

    def test_aisle_hot_elevates_board_temp(self):
        normal = self._call("rack-01", _state())
        hot = self._call("rack-01", _state(aisles_hot={"aisle-01"}))
        assert hot["cooling"]["board_temp"] > normal["cooling"]["board_temp"]

    def test_aisle_hot_adds_leak(self):
        normal = self._call("rack-01", _state())
        hot = self._call("rack-01", _state(aisles_hot={"aisle-01"}))
        assert hot["cooling"]["leak"] > normal["cooling"]["leak"]

    def test_other_rack_unaffected_by_racks_crit(self):
        result = self._call("rack-02", _state(racks_crit={"rack-01"}))
        assert result["is_rack_down"] is False

    def test_other_rack_unaffected_by_aisles_hot(self):
        """aisle-01 is hot but rack-02 is in aisle-02 — no effect."""
        normal = self._call("rack-02", _state())
        hot = self._call("rack-02", _state(aisles_hot={"aisle-01"}))
        assert hot["cooling"]["leak"] == normal["cooling"]["leak"]

    def test_rack_down_override_forces_down(self):
        overrides = {"rack-01": [{"metric": "rack_down", "value": 1}]}
        result = self._call("rack-01", _state(), overrides_by_rack=overrides)
        assert result["is_rack_down"] is True
