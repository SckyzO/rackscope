# Root conftest.py — excludes performance benchmarks from the regular suite.
# Run manually: pytest tests/perf/ -m perf -v -s
collect_ignore_glob = ["tests/perf/*"]
