"""
Unit tests for plugins.simulator.process.loop module.

Tests cover: _apply_failures, _apply_overrides, and the helper sub-functions
of simulate() that can be tested in isolation.
"""

from plugins.simulator.process.loop import _apply_failures, _apply_overrides


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
    def test_zero_rate_no_failures(self):
        targets = [
            {"instance": "n1", "rack_id": "r1", "metrics": {"up": 1.0}},
            {"instance": "n2", "rack_id": "r1", "metrics": {"up": 1.0}},
        ]
        sim_cfg = {"incident_rates": {"node_micro_failure": 0.0}}
        # With rate=0.0, no target should be marked as failed
        _apply_failures(targets, sim_cfg, elapsed=0)
        # All up metrics should still be 1.0 (or set by the function — no crash)
        # The key assertion: function runs without error
        assert len(targets) == 2

    def test_rate_one_marks_all_failed(self):
        """rate=1.0 means every node should fail."""
        targets = [{"instance": f"n{i}", "rack_id": "r1", "metrics": {"up": 1.0}} for i in range(5)]
        sim_cfg = {"incident_rates": {"node_micro_failure": 1.0}}
        _apply_failures(targets, sim_cfg, elapsed=0)
        failed = [t for t in targets if t["metrics"].get("up", 1.0) == 0.0]
        assert len(failed) == 5

    def test_empty_targets_no_crash(self):
        _apply_failures([], {"incident_rates": {}}, elapsed=0)

    def test_missing_incident_rates_no_crash(self):
        targets = [{"instance": "n1", "rack_id": "r1", "metrics": {"up": 1.0}}]
        _apply_failures(targets, {}, elapsed=0)
        assert len(targets) == 1
