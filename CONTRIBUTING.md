# Contributing

## Rules
- Small PRs, single intent per PR
- English for code/comments/commit messages
- Do not add a mandatory database
- Do not add direct metric scraping (SNMP/Redfish/etc.)
- Keep PromQL queries vectorized (no per-device query loops)

## Dev setup
- Python 3.11+ recommended
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -e .[dev]`
- `pytest`
