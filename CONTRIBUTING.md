# Contributing to Rackscope

Thank you for your interest in contributing! Rackscope is an open-source physical monitoring dashboard for datacenters and HPC environments.

## Development Stack

- **Backend**: Python 3.12 (FastAPI)
- **Frontend**: React 19 (Vite, TypeScript, Tailwind CSS v4)
- **Infrastructure**: Docker & Docker Compose
- **Telemetry**: Prometheus

## Getting Started

1. **Fork and clone** the repository
2. **Install Docker** and Docker Compose (the only requirement)
3. **Start the stack**:
   ```bash
   make up
   ```
4. **Open the UI**: http://localhost:5173
5. **API docs**: http://localhost:8000/docs (Swagger UI)

## Development Commands

```bash
make test           # Run all backend tests (pytest)
make test-v         # Verbose — shows each test name
make test-k K=planner  # Filter by keyword
make test-file F=tests/test_model.py  # Specific file
make coverage       # Coverage report (htmlcov/)
make lint           # ruff (Python) + eslint + prettier (frontend)
make typecheck      # mypy — target: 0 errors
make security       # bandit + npm audit + pip-audit
make quality        # lint + typecheck + complexity + coverage
make ci             # Full pipeline: quality + security
make docs           # Start Docusaurus at http://localhost:3001
```

## Guidelines

- **English only**: code, comments, and commit messages
- **Small focused PRs**: one intent per commit
- **Add tests**: use `make test` and `make coverage` to verify
- **Update docs**: every user-facing feature must be reflected in `website/docs/`
- **Run `make lint`** before submitting a pull request

## Writing Tests

Tests run inside Docker — no local Python needed.

> **Important**: tests calling write endpoints (`PUT /api/config`, `POST /api/setup/wizard/disable`) must use the `protect_app_yaml` fixture to avoid corrupting `config/app.yaml`:
>
> ```python
> def test_my_write_endpoint(protect_app_yaml):
>     resp = client.put("/api/config", json={...})
>     assert resp.status_code == 200
> ```
>
> See `tests/api/test_config_router.py` for the fixture definition.

## License

By contributing, you agree your work is licensed under [AGPL-3.0-or-later](./LICENSE).
