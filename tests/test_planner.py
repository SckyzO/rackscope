from rackscope.telemetry.planner import _expand_nodes_pattern


def test_expand_nodes_pattern():
    assert _expand_nodes_pattern("compute[001-003]") == [
        "compute001",
        "compute002",
        "compute003",
    ]
