# Contributing to Rackscope

Thank you for your interest in contributing! Rackscope is an open-source physical monitoring dashboard.

## Development Stack

- **Backend**: Python 3.12 (FastAPI)
- **Frontend**: React (Vite, TypeScript, Tailwind CSS v4)
- **Infrastructure**: Docker & Docker Compose
- **Telemetry**: Prometheus

## Getting Started

1.  **Fork and Clone** the repository.
2.  **Environment**: Ensure you have Docker and Docker Compose installed.
3.  **Run the Stack**:
    ```bash
    make up
    ```
4.  **Access the UI**: [http://localhost:5173](http://localhost:5173)

## Guidelines

- **English only**: Code, comments, and commit messages must be in English.
- **Incremental changes**: Small, focused PRs are preferred.
- **Privacy**: Never commit files from the `ARCHITECTURE/` directory.
- **Testing**: Add tests for new features. Use `make test` to verify.

## Tooling

- **Linting**: We use `ruff` for Python and `eslint` for React.
- **Formatting**: We use `ruff format` and `prettier`.

Run `make lint` before submitting a pull request.