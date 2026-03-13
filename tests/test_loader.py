"""
Tests for model/loader.py

Covers error paths and edge cases in YAML loading:
- Malformed YAML
- Missing files
- Validation errors
- Segmented topology loading
- Checks library loading
- Metrics library loading
"""

import pytest
import yaml

from rackscope.model.loader import (
    load_topology,
    load_catalog,
    load_checks_library,
    load_metrics_library,
    load_app_config,
    InvalidFormatError,
    dump_yaml,
)


# ── Topology loading ──────────────────────────────────────────────────────────


def test_load_topology_file_not_found():
    """Test error when topology file doesn't exist."""
    with pytest.raises(FileNotFoundError):
        load_topology("/nonexistent/topology.yaml")


def test_load_topology_malformed_yaml(tmp_path):
    """Test error when YAML is malformed."""
    topo_file = tmp_path / "topology.yaml"
    topo_file.write_text("invalid: yaml: [unclosed")

    with pytest.raises(InvalidFormatError) as exc_info:
        load_topology(topo_file)

    assert "error parsing yaml" in str(exc_info.value).lower()


def test_load_topology_validation_error(tmp_path):
    """Test error when topology fails Pydantic validation."""
    topo_file = tmp_path / "topology.yaml"
    topo_file.write_text(
        yaml.safe_dump(
            {
                "sites": [
                    {
                        "id": "site1",
                        # Missing 'name' field (required)
                        "rooms": [],
                    }
                ]
            }
        )
    )

    with pytest.raises(InvalidFormatError) as exc_info:
        load_topology(topo_file)

    assert "validation failed" in str(exc_info.value).lower()


def test_load_topology_empty_file(tmp_path):
    """Test loading empty topology file returns empty Topology."""
    topo_file = tmp_path / "topology.yaml"
    topo_file.write_text("")

    topology = load_topology(topo_file)

    assert len(topology.sites) == 0


def test_load_segmented_topology_missing_sites_file(tmp_path):
    """Test error when sites.yaml is missing in segmented topology."""
    with pytest.raises(FileNotFoundError) as exc_info:
        load_topology(tmp_path)

    assert "sites file not found" in str(exc_info.value).lower()


def test_load_segmented_topology_missing_room_file(tmp_path):
    """Test warning when room file is missing (graceful degradation)."""
    sites_file = tmp_path / "sites.yaml"
    sites_file.write_text(
        yaml.safe_dump(
            {
                "sites": [
                    {
                        "id": "site1",
                        "name": "Site 1",
                        "rooms": [{"id": "room1"}],
                    }
                ]
            }
        )
    )

    # Don't create room file — loader should log warning and skip
    topology = load_topology(tmp_path)

    assert len(topology.sites) == 1
    assert len(topology.sites[0].rooms) == 0  # room skipped


def test_load_segmented_topology_missing_aisle_file(tmp_path, caplog):
    """Test warning when aisle file is missing."""
    sites_file = tmp_path / "sites.yaml"
    sites_file.write_text(
        yaml.safe_dump(
            {
                "sites": [
                    {
                        "id": "site1",
                        "name": "Site 1",
                        "rooms": [{"id": "room1"}],
                    }
                ]
            }
        )
    )

    room_dir = tmp_path / "datacenters" / "site1" / "rooms" / "room1"
    room_dir.mkdir(parents=True, exist_ok=True)
    (room_dir / "room.yaml").write_text(
        yaml.safe_dump(
            {
                "id": "room1",
                "name": "Room 1",
                "aisles": [{"id": "aisle-a"}],
                "standalone_racks": [],
            }
        )
    )

    # Don't create aisle file — loader should log warning
    topology = load_topology(tmp_path)

    assert len(topology.sites) == 1
    assert len(topology.sites[0].rooms[0].aisles) == 0  # aisle skipped
    assert "missing aisle file" in caplog.text.lower()


def test_load_segmented_topology_missing_rack_file(tmp_path, caplog):
    """Test warning when rack file is missing."""
    sites_file = tmp_path / "sites.yaml"
    sites_file.write_text(
        yaml.safe_dump(
            {
                "sites": [
                    {
                        "id": "site1",
                        "name": "Site 1",
                        "rooms": [{"id": "room1"}],
                    }
                ]
            }
        )
    )

    room_dir = tmp_path / "datacenters" / "site1" / "rooms" / "room1"
    room_dir.mkdir(parents=True, exist_ok=True)
    (room_dir / "room.yaml").write_text(
        yaml.safe_dump(
            {
                "id": "room1",
                "name": "Room 1",
                "aisles": [{"id": "aisle-a"}],
                "standalone_racks": [],
            }
        )
    )

    aisle_dir = room_dir / "aisles" / "aisle-a"
    aisle_dir.mkdir(parents=True, exist_ok=True)
    (aisle_dir / "aisle.yaml").write_text(
        yaml.safe_dump(
            {
                "id": "aisle-a",
                "name": "Aisle A",
                "racks": ["rack01"],  # Reference non-existent rack
            }
        )
    )

    topology = load_topology(tmp_path)

    assert len(topology.sites[0].rooms[0].aisles) == 1
    assert len(topology.sites[0].rooms[0].aisles[0].racks) == 0  # rack skipped
    assert "missing rack file" in caplog.text.lower()


def test_load_segmented_topology_validation_error(tmp_path):
    """Test error when segmented topology has invalid data."""
    sites_file = tmp_path / "sites.yaml"
    sites_file.write_text(
        yaml.safe_dump(
            {
                "sites": [
                    {
                        "id": "site1",
                        "name": "Site 1",
                        "rooms": [{"id": "room1"}],
                    }
                ]
            }
        )
    )

    room_dir = tmp_path / "datacenters" / "site1" / "rooms" / "room1"
    room_dir.mkdir(parents=True, exist_ok=True)
    # Create room with invalid device — devices need template_id and u_position
    (room_dir / "room.yaml").write_text(
        yaml.safe_dump(
            {
                "id": "room1",
                "name": "Room 1",
                "aisles": [],
                "standalone_racks": [
                    {
                        "id": "rack01",
                        "name": "Rack 01",
                        "devices": [
                            {
                                "id": "dev1",
                                "name": "Device 1",
                                # Missing required template_id and u_position
                            }
                        ],
                    }
                ],
            }
        )
    )

    with pytest.raises(InvalidFormatError) as exc_info:
        load_topology(tmp_path)

    assert "validation failed" in str(exc_info.value).lower()


# ── Catalog loading ───────────────────────────────────────────────────────────


def test_load_catalog_nonexistent_dir():
    """Test loading catalog from non-existent directory returns empty catalog."""
    catalog = load_catalog("/nonexistent/templates")

    assert len(catalog.device_templates) == 0
    assert len(catalog.rack_templates) == 0


def test_load_catalog_invalid_yaml(tmp_path, caplog):
    """Test warning when template file has invalid YAML."""
    templates_dir = tmp_path / "templates"
    templates_dir.mkdir()
    (templates_dir / "bad.yaml").write_text("invalid: yaml: [unclosed")

    catalog = load_catalog(templates_dir)

    assert len(catalog.device_templates) == 0
    assert "failed to load template file" in caplog.text.lower()


def test_load_catalog_invalid_template(tmp_path, caplog):
    """Test warning when template has invalid data."""
    templates_dir = tmp_path / "templates"
    templates_dir.mkdir()
    (templates_dir / "bad.yaml").write_text(
        yaml.safe_dump(
            {
                "templates": [
                    {
                        "id": "bad_template",
                        # Missing required fields
                    }
                ]
            }
        )
    )

    catalog = load_catalog(templates_dir)

    assert len(catalog.device_templates) == 0
    # Warning should be logged


# ── Checks library loading ────────────────────────────────────────────────────


def test_load_checks_library_nonexistent_path():
    """Test loading checks from non-existent path returns empty library."""
    library = load_checks_library("/nonexistent/checks")

    assert len(library.checks) == 0


def test_load_checks_library_invalid_yaml(tmp_path, caplog):
    """Test warning when checks file has invalid YAML."""
    checks_file = tmp_path / "bad.yaml"
    checks_file.write_text("invalid: yaml: [unclosed")

    library = load_checks_library(checks_file)

    assert len(library.checks) == 0
    assert "failed to parse checks file" in caplog.text.lower()


def test_load_checks_library_invalid_check(tmp_path, caplog):
    """Test warning when check definition is invalid."""
    checks_file = tmp_path / "bad.yaml"
    checks_file.write_text(
        yaml.safe_dump(
            {
                "checks": [
                    {
                        "id": "bad_check",
                        # Missing required fields
                    }
                ]
            }
        )
    )

    library = load_checks_library(checks_file)

    assert len(library.checks) == 0
    assert "failed to load check" in caplog.text.lower()


def test_load_checks_library_kinds_format(tmp_path):
    """Test loading checks from 'kinds' format (legacy)."""
    checks_file = tmp_path / "checks.yaml"
    checks_file.write_text(
        yaml.safe_dump(
            {
                "kinds": {
                    "server": [
                        {
                            "id": "node_up",
                            "name": "Node Up",
                            "scope": "node",
                            "expr": "up",
                            "output": "bool",
                            "rules": [{"op": "==", "value": 0, "severity": "CRIT"}],
                        }
                    ],
                    "storage": [
                        {
                            "id": "storage_up",
                            "name": "Storage Up",
                            "scope": "node",
                            "expr": "up",
                            "output": "bool",
                            "rules": [{"op": "==", "value": 0, "severity": "CRIT"}],
                        }
                    ],
                }
            }
        )
    )

    library = load_checks_library(checks_file)

    assert len(library.checks) == 2
    assert library.checks[0].kind == "server"
    assert library.checks[1].kind == "storage"


# ── Metrics library loading ───────────────────────────────────────────────────


def test_load_metrics_library_nonexistent_path(caplog):
    """Test loading metrics from non-existent path returns empty library."""
    library = load_metrics_library("/nonexistent/metrics")

    assert len(library.metrics) == 0
    assert "not found" in caplog.text.lower()


def test_load_metrics_library_invalid_yaml(tmp_path, caplog):
    """Test warning when metrics file has invalid YAML."""
    metrics_file = tmp_path / "bad.yaml"
    metrics_file.write_text("invalid: yaml: [unclosed")

    library = load_metrics_library(metrics_file)

    assert len(library.metrics) == 0
    assert "failed to parse metrics file" in caplog.text.lower()


def test_load_metrics_library_invalid_metric(tmp_path, caplog):
    """Test warning when metric definition is invalid."""
    metrics_file = tmp_path / "bad.yaml"
    metrics_file.write_text(
        yaml.safe_dump(
            {
                "metrics": [
                    {
                        "id": "bad_metric",
                        # Missing required fields
                    }
                ]
            }
        )
    )

    library = load_metrics_library(metrics_file)

    assert len(library.metrics) == 0
    assert "failed to load metric" in caplog.text.lower()


def test_load_metrics_library_single_metric(tmp_path):
    """Test loading single metric definition (not in 'metrics' list)."""
    metrics_file = tmp_path / "metric.yaml"
    # MetricDefinition requires 'metric' field (the PromQL expr) and 'display' field
    metrics_file.write_text(
        yaml.safe_dump(
            {
                "id": "node_temp",
                "name": "Node Temperature",
                "metric": "node_hwmon_temp_celsius",  # Changed from 'expr' to 'metric'
                "category": "hardware",
                "display": {  # Required field
                    "unit": "celsius",
                    "chart_type": "line",
                    "color": "#ff5722",
                },
            }
        )
    )

    library = load_metrics_library(metrics_file)

    assert len(library.metrics) == 1
    assert library.metrics[0].id == "node_temp"


# ── App config loading ────────────────────────────────────────────────────────


def test_load_app_config_file_not_found():
    """Test error when app config file doesn't exist."""
    with pytest.raises(FileNotFoundError):
        load_app_config("/nonexistent/app.yaml")


def test_load_app_config_malformed_yaml(tmp_path):
    """Test error when app config YAML is malformed."""
    config_file = tmp_path / "app.yaml"
    config_file.write_text("invalid: yaml: [unclosed")

    with pytest.raises(InvalidFormatError) as exc_info:
        load_app_config(config_file)

    assert "error parsing yaml" in str(exc_info.value).lower()


def test_load_app_config_empty_file(tmp_path):
    """Test error when app config file is empty."""
    config_file = tmp_path / "app.yaml"
    config_file.write_text("")

    with pytest.raises(InvalidFormatError) as exc_info:
        load_app_config(config_file)

    assert "empty" in str(exc_info.value).lower()


def test_load_app_config_validation_error(tmp_path):
    """Test error when app config fails Pydantic validation."""
    config_file = tmp_path / "app.yaml"
    config_file.write_text(
        yaml.safe_dump(
            {
                "paths": {
                    # Missing required 'topology' field
                    "templates": "templates",
                }
            }
        )
    )

    with pytest.raises(InvalidFormatError) as exc_info:
        load_app_config(config_file)

    assert "validation failed" in str(exc_info.value).lower()


# ── dump_yaml ─────────────────────────────────────────────────────────────────


def test_dump_yaml_compact_matrix():
    """Test that dump_yaml formats matrices in flow style."""
    data = {
        "layout": {
            "type": "grid",
            "matrix": [[1, 2], [3, 4]],
        }
    }

    result = dump_yaml(data)

    # Matrix rows should be in flow style: [1, 2]
    assert "[1, 2]" in result
    assert "[3, 4]" in result


def test_dump_yaml_preserves_order():
    """Test that dump_yaml preserves key order."""
    data = {
        "first": 1,
        "second": 2,
        "third": 3,
    }

    result = dump_yaml(data)
    lines = result.strip().split("\n")

    assert "first" in lines[0]
    assert "second" in lines[1]
    assert "third" in lines[2]
