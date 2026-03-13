"""
Shared pytest fixtures for the Rackscope test suite.
"""

# Exclude memory-intensive perf benchmarks from the regular suite.
# Run manually: pytest tests/perf/ -m perf -v -s
collect_ignore_glob = ["tests/perf/*"]

import pytest


@pytest.fixture(autouse=True)
def reset_global_state():
    """Reset backend global state before each test.

    Prevents state pollution between tests that modify TOPOLOGY, CATALOG,
    METRICS_LIBRARY, or other app-level globals via the TestClient.
    """
    from rackscope.api import app as app_module

    saved = {
        "TOPOLOGY": app_module.TOPOLOGY,
        "CATALOG": app_module.CATALOG,
        "CHECKS_LIBRARY": app_module.CHECKS_LIBRARY,
        "METRICS_LIBRARY": app_module.METRICS_LIBRARY,
        "APP_CONFIG": app_module.APP_CONFIG,
        "PLANNER": app_module.PLANNER,
    }

    # Clear ServiceCache before and after each test — prevents stale responses
    # from leaking across tests that mock TOPOLOGY but share the global cache.
    app_module.SERVICE_CACHE._store.clear()

    yield

    app_module.TOPOLOGY = saved["TOPOLOGY"]
    app_module.CATALOG = saved["CATALOG"]
    app_module.CHECKS_LIBRARY = saved["CHECKS_LIBRARY"]
    app_module.METRICS_LIBRARY = saved["METRICS_LIBRARY"]
    app_module.APP_CONFIG = saved["APP_CONFIG"]
    app_module.PLANNER = saved["PLANNER"]
    app_module.SERVICE_CACHE._store.clear()
