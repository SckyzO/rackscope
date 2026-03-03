"""
Tests for Pydantic domain models.

Validates that the core topology models enforce their constraints and that
the YAML loader round-trips correctly.
"""

from rackscope.model.domain import Topology, Site, Aisle, Rack
from rackscope.model.checks import CheckDefinition, CheckRule
from rackscope.model.loader import load_topology
import pytest
import yaml
from pydantic import ValidationError


def test_rack_model():
    rack = Rack(id="r1", name="Rack 1")
    assert rack.id == "r1"
    assert rack.u_height == 42


def test_aisle_model():
    rack = Rack(id="r1", name="Rack 1")
    aisle = Aisle(id="a1", name="Aisle 1", racks=[rack])
    assert len(aisle.racks) == 1
    assert aisle.racks[0].id == "r1"


def test_topology_validation():
    with pytest.raises(Exception):
        Topology(sites=[Site(id="s1", name="S1"), Site(id="s1", name="S1 duplicated")])


def test_load_topology(tmp_path):
    d = tmp_path / "config"
    d.mkdir()
    f = d / "topology.yaml"
    content = {
        "sites": [
            {
                "id": "dc1",
                "name": "DC1",
                "rooms": [
                    {
                        "id": "room1",
                        "name": "Room 1",
                        "aisles": [
                            {
                                "id": "aisle1",
                                "name": "Aisle 1",
                                "racks": [{"id": "r1", "name": "Rack 1"}],
                            }
                        ],
                    }
                ],
            }
        ]
    }
    f.write_text(yaml.dump(content))

    topo = load_topology(f)
    assert len(topo.sites) == 1
    assert topo.sites[0].id == "dc1"
    assert topo.sites[0].rooms[0].aisles[0].racks[0].id == "r1"


# ── CheckDefinition.for_duration ──────────────────────────────────────────────

def _make_check(**kwargs):
    """Helper: build a minimal valid CheckDefinition via model_validate."""
    base = {
        "id": "test_check",
        "name": "Test Check",
        "scope": "node",
        "kind": "server",
        "expr": 'up{instance=~"$instances"}',
        "output": "bool",
        "for": None,
        "rules": [{"op": "==", "value": 0, "severity": "CRIT"}],
    }
    base.update(kwargs)
    return CheckDefinition.model_validate(base)


def test_check_for_null_is_valid():
    """for: null is accepted — means immediate firing."""
    c = _make_check(**{"for": None})
    assert c.for_duration is None


def test_check_for_duration_valid_formats():
    """Valid Prometheus duration strings are accepted."""
    for duration in ["30s", "1m", "5m", "10m", "1h", "2h", "1d"]:
        c = _make_check(**{"for": duration})
        assert c.for_duration == duration


def test_check_for_duration_invalid_format():
    """Invalid duration strings raise ValidationError."""
    for bad in ["5min", "1 m", "five", "5M", ""]:
        with pytest.raises(ValidationError):
            _make_check(**{"for": bad})


def test_check_for_duration_defaults_none_when_absent():
    """Omitting 'for' key defaults to None (for programmatic use).
    Production YAML files are validated by the loader, not the Pydantic model."""
    c = CheckDefinition.model_validate({
        "id": "test",
        "name": "Test",
        "scope": "node",
        "kind": "server",
        "expr": "up",
        "output": "bool",
        # 'for' key intentionally absent
        "rules": [{"op": "==", "value": 0, "severity": "CRIT"}],
    })
    assert c.for_duration is None
