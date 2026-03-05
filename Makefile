SHELL := /bin/bash

# Docker Compose files
COMPOSE_DEV := docker-compose.dev.yml
COMPOSE_PROD := docker-compose.prod.yml

.PHONY: up down restart logs build lint test test-v test-k test-file clean coverage typecheck complexity quality ci shell-backend shell-frontend watch-logs traefik-logs cert
.PHONY: up-prod down-prod logs-prod build-prod
.PHONY: docs docs-build docs-logs
.PHONY: security security-backend security-frontend security-deps

# Development Stack Management (default)
# First time: run `make cert` to generate the self-signed TLS certificate.
# Access points after `make up`:
#   https://localhost          → Rackscope UI  (browser warning: add exception)
#   https://localhost/api/docs → FastAPI Swagger UI
#   http://localhost:8080      → Traefik dashboard
#   http://localhost:9090      → Prometheus
#   http://localhost:3001      → Docusaurus docs  (make docs)
up:
	docker compose -f $(COMPOSE_DEV) up -d

down:
	docker compose -f $(COMPOSE_DEV) down

restart:
	docker compose -f $(COMPOSE_DEV) restart

logs:
	docker compose -f $(COMPOSE_DEV) logs -f

build:
	docker compose -f $(COMPOSE_DEV) build

# Production Stack Management
up-prod:
	docker compose -f $(COMPOSE_PROD) up -d

down-prod:
	docker compose -f $(COMPOSE_PROD) down

logs-prod:
	docker compose -f $(COMPOSE_PROD) logs -f

build-prod:
	docker compose -f $(COMPOSE_PROD) build

# Code Quality Tools
lint:
	docker compose -f $(COMPOSE_DEV) exec backend ruff check .
	docker compose -f $(COMPOSE_DEV) exec backend ruff format --check .
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint:css
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint:format

## Run all tests (quiet)
test:
	docker compose -f $(COMPOSE_DEV) exec backend pytest -q

## Verbose output — shows each test name
test-v:
	docker compose -f $(COMPOSE_DEV) exec backend pytest -v

## Run tests matching a keyword: make test-k K=planner
test-k:
	docker compose -f $(COMPOSE_DEV) exec backend pytest -v -k "$(K)"

## Run a specific file or directory: make test-file F=tests/test_model.py
test-file:
	docker compose -f $(COMPOSE_DEV) exec backend pytest -v $(F)

## Coverage report (terminal + HTML at htmlcov/index.html)
coverage:
	docker compose -f $(COMPOSE_DEV) exec backend pytest --cov=rackscope --cov-report=term --cov-report=html -q
	@echo "Coverage report: htmlcov/index.html"

typecheck:
	docker compose -f $(COMPOSE_DEV) exec backend /home/appuser/.local/bin/mypy src/rackscope

complexity:
	docker compose -f $(COMPOSE_DEV) exec backend /home/appuser/.local/bin/radon cc src/rackscope -a -nc

quality: lint typecheck complexity coverage
	@echo "✅ All quality checks complete!"

## Full CI pipeline: quality + security (run before any release)
ci: quality security
	@echo "🚀 CI pipeline complete — ready to ship!"

# ── Security Audit ──────────────────────────────────────────────────────────
# Run: make security
# Requires stack running: make up

## Backend: bandit static analysis (Python)
security-backend:
	@echo "🔍 Backend security scan (bandit)..."
	docker compose -f $(COMPOSE_DEV) exec backend python3 -m bandit -r src/rackscope -ll -f screen
	@echo "✅ Backend security scan complete."

## Frontend: npm audit
security-frontend:
	@echo "🔍 Frontend dependency audit (npm audit)..."
	docker compose -f $(COMPOSE_DEV) exec frontend npm audit --audit-level=high
	@echo "✅ Frontend security audit complete."

## Backend deps: pip-audit
security-deps:
	@echo "🔍 Python dependency audit (pip-audit)..."
	docker compose -f $(COMPOSE_DEV) exec backend pip-audit 2>/dev/null || \
	docker compose -f $(COMPOSE_DEV) exec backend python3 -m pip_audit 2>/dev/null || \
	(docker compose -f $(COMPOSE_DEV) exec backend pip install --quiet pip-audit && \
	 docker compose -f $(COMPOSE_DEV) exec backend pip-audit)
	@echo "✅ Python dependency audit complete."

## Full security audit
security: security-backend security-frontend security-deps
	@echo "🛡️  Full security audit complete!"

# Development Helpers
shell-backend:
	docker compose -f $(COMPOSE_DEV) exec backend bash

shell-frontend:
	docker compose -f $(COMPOSE_DEV) exec frontend sh

watch-logs:
	docker compose -f $(COMPOSE_DEV) logs -f backend frontend

traefik-logs:
	docker compose -f $(COMPOSE_DEV) logs -f traefik

# Generate a self-signed TLS certificate for local HTTPS (valid 10 years)
# Re-run to rotate the certificate. Certs are git-ignored.
cert:
	mkdir -p traefik/certs
	openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
		-keyout traefik/certs/key.pem \
		-out traefik/certs/cert.pem \
		-subj "/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
	@echo "✅ Certificate generated in traefik/certs/"
	@echo "   Open https://localhost and add a browser exception for the self-signed cert."

# Documentation site (Docusaurus — runs in Docker)
docs:
	docker compose -f $(COMPOSE_DEV) up docs -d
	@echo "📚 Docs available at http://localhost:3001"

docs-build:
	docker compose -f $(COMPOSE_DEV) run --rm docs npm run build

docs-logs:
	docker compose -f $(COMPOSE_DEV) logs -f docs

# Cleanup
clean:
	docker compose -f $(COMPOSE_DEV) down -v
	rm -rf __pycache__ .pytest_cache .venv frontend/node_modules htmlcov .coverage .mypy_cache
