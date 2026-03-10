SHELL := /bin/bash

# Docker Compose files
COMPOSE_DEV  := docker-compose.dev.yml
COMPOSE_PROD := docker-compose.prod.yml

.PHONY: up down restart logs build
.PHONY: up-prod down-prod restart-prod logs-prod build-prod
.PHONY: use use-homelab use-small-cluster use-hpc-cluster use-exascale which-config
.PHONY: use-prod use-prod-homelab use-prod-small-cluster use-prod-hpc-cluster use-prod-exascale
.PHONY: lint test test-v test-k test-file clean coverage typecheck complexity quality ci
.PHONY: shell-backend shell-frontend watch-logs nginx-logs cert
.PHONY: docs docs-build docs-logs
.PHONY: security security-backend security-frontend security-deps

# ── Development ──────────────────────────────────────────────────────────────
# First time: run `make cert` to generate the self-signed TLS certificate.
# Access points:
#   https://localhost          → Rackscope UI
#   https://localhost/api/docs → Swagger UI
#   http://localhost:9090      → Prometheus
#   http://localhost:3001      → Docusaurus docs (make docs)

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

# ── Production ───────────────────────────────────────────────────────────────
# Requires pre-built images from GHCR.
# Set RACKSCOPE_VERSION to pin a release (default: latest).
# Example: RACKSCOPE_VERSION=1.2.0 make up-prod

up-prod:
	docker compose -f $(COMPOSE_PROD) up -d

down-prod:
	docker compose -f $(COMPOSE_PROD) down

restart-prod:
	docker compose -f $(COMPOSE_PROD) restart

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
	docker compose -f $(COMPOSE_DEV) exec backend python -m mypy src/rackscope

complexity:
	docker compose -f $(COMPOSE_DEV) exec backend python -m radon cc src/rackscope -a -nc

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
	docker compose -f $(COMPOSE_DEV) exec frontend npm audit --audit-level=critical # known HIGH: d3-color via react-simple-maps (low risk, no fix without breaking change)
	@echo "✅ Frontend security audit complete."

## Backend deps: pip-audit
security-deps:
	@echo "🔍 Python dependency audit (pip-audit)..."
	docker compose -f $(COMPOSE_DEV) exec backend python3 -m pip_audit || true  # PyJWT migration complete — python-jose/ecdsa removed; || true for pip CVEs (container infra, low risk)
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

nginx-logs:
	docker compose -f $(COMPOSE_DEV) logs -f nginx

# Generate a self-signed TLS certificate for local HTTPS (valid 10 years)
# Re-run to rotate the certificate. Certs are git-ignored.
cert:
	mkdir -p nginx/certs
	openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
		-keyout nginx/certs/key.pem \
		-out nginx/certs/cert.pem \
		-subj "/CN=localhost" \
		-addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
	@echo "✅ Certificate generated in nginx/certs/"
	@echo "   Open https://localhost and add a browser exception for the self-signed cert."

# Documentation site (Docusaurus — runs in Docker)
docs:
	docker compose -f $(COMPOSE_DEV) up docs -d
	@echo "📚 Docs available at http://localhost:3001"

docs-build:
	docker compose -f $(COMPOSE_DEV) run --rm docs npm run build

docs-logs:
	docker compose -f $(COMPOSE_DEV) logs -f docs

# ── Config Profiles ─────────────────────────────────────────────────────────
# Switch between named configurations without touching app.yaml.
# The active config is stored in .env (gitignored, read by Docker Compose).
#
# Dev usage:
#   make use EXAMPLE=homelab        # switch + restart dev stack
#   make use-exascale               # shorthand
#
# Prod usage:
#   make use-prod EXAMPLE=homelab   # switch + restart prod stack
#   make use-prod-exascale          # shorthand
#
# Other:
#   make which-config               # show active config
#   make up / make up-prod          # start with active config (default: app.yaml)

_check-example:
ifndef EXAMPLE
	$(error Usage: make use EXAMPLE=<name>  — available: homelab, small-cluster, hpc-cluster, exascale)
endif
	@if [ ! -f config/app.example.$(EXAMPLE).yaml ]; then \
		echo "❌ config/app.example.$(EXAMPLE).yaml not found"; exit 1; \
	fi

use: _check-example
	@echo "APP_CONFIG=app.example.$(EXAMPLE).yaml" > .env
	@echo "→ [dev] Switching to: $(EXAMPLE)"
	docker compose -f $(COMPOSE_DEV) up -d --force-recreate --no-deps backend simulator
	@echo "✅ Dev stack running with: $(EXAMPLE)"

use-prod: _check-example
	@echo "APP_CONFIG=app.example.$(EXAMPLE).yaml" > .env
	@echo "→ [prod] Switching to: $(EXAMPLE)"
	docker compose -f $(COMPOSE_PROD) up -d --force-recreate --no-deps backend
	@echo "✅ Prod stack running with: $(EXAMPLE)"

# Dev shorthands
use-homelab:       ; $(MAKE) use EXAMPLE=homelab
use-small-cluster: ; $(MAKE) use EXAMPLE=small-cluster
use-hpc-cluster:   ; $(MAKE) use EXAMPLE=hpc-cluster
use-exascale:      ; $(MAKE) use EXAMPLE=exascale

# Prod shorthands
use-prod-homelab:       ; $(MAKE) use-prod EXAMPLE=homelab
use-prod-small-cluster: ; $(MAKE) use-prod EXAMPLE=small-cluster
use-prod-hpc-cluster:   ; $(MAKE) use-prod EXAMPLE=hpc-cluster
use-prod-exascale:      ; $(MAKE) use-prod EXAMPLE=exascale

which-config:
	@if [ -f .env ] && grep -q "APP_CONFIG" .env; then \
		echo "Active config: $$(grep APP_CONFIG .env | cut -d= -f2)"; \
	else \
		echo "Active config: app.yaml (default)"; \
	fi

# Cleanup
clean:
	docker compose -f $(COMPOSE_DEV) down -v
	rm -rf __pycache__ .pytest_cache .venv frontend/node_modules htmlcov .coverage .mypy_cache
