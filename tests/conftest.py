"""
Shared pytest fixtures for the Rackscope test suite.
"""

import pytest

# Exclude memory-intensive perf benchmarks from the regular suite.
# Run manually: pytest tests/perf/ -m perf -v -s
collect_ignore_glob = ["tests/perf/*"]


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset backend global state before each test.

    Prevents state pollution between tests that modify TOPOLOGY, CATALOG,
    METRICS_LIBRARY, or other app-level globals via the TestClient.
    """
    from rackscope.api import app as app_module

    from rackscope.api.app import app  # needed for dependency_overrides

    saved = {
        "TOPOLOGY": app_module.TOPOLOGY,
        "TOPOLOGY_INDEX": app_module.TOPOLOGY_INDEX,
        "CATALOG": app_module.CATALOG,
        "CHECKS_LIBRARY": app_module.CHECKS_LIBRARY,
        "METRICS_LIBRARY": app_module.METRICS_LIBRARY,
        "APP_CONFIG": app_module.APP_CONFIG,
        "PLANNER": app_module.PLANNER,
        "TARGETS_BY_CHECK": app_module.TARGETS_BY_CHECK,
    }

    # Clear caches and overrides before each test
    app_module.SERVICE_CACHE._store.clear()
    app_module.SERVICE_CACHE._inflight.clear()
    app.dependency_overrides.clear()

    yield

    app_module.TOPOLOGY = saved["TOPOLOGY"]
    app_module.TOPOLOGY_INDEX = saved["TOPOLOGY_INDEX"]
    app_module.CATALOG = saved["CATALOG"]
    app_module.CHECKS_LIBRARY = saved["CHECKS_LIBRARY"]
    app_module.METRICS_LIBRARY = saved["METRICS_LIBRARY"]
    app_module.APP_CONFIG = saved["APP_CONFIG"]
    app_module.PLANNER = saved["PLANNER"]
    app_module.TARGETS_BY_CHECK = saved["TARGETS_BY_CHECK"]
    app_module.SERVICE_CACHE._store.clear()
    app_module.SERVICE_CACHE._inflight.clear()
    app.dependency_overrides.clear()
