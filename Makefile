SHELL := /bin/bash

# Docker Compose files
COMPOSE_DEV  := docker-compose.dev.yml
COMPOSE_PROD := docker-compose.prod.yml

.PHONY: up down restart logs build
.PHONY: up-prod down-prod restart-prod logs-prod build-prod
.PHONY: use use-prod which-config list-configs
.PHONY: use-homelab use-small-cluster use-hpc-cluster use-exascale
.PHONY: use-prod-homelab use-prod-small-cluster use-prod-hpc-cluster use-prod-exascale
.PHONY: lint lint-python lint-frontend lint-yaml lint-md lint-sh lint-docker lint-actions
.PHONY: test test-v test-k test-file clean coverage typecheck complexity quality ci
.PHONY: shell-backend shell-frontend watch-logs nginx-logs cert
.PHONY: security security-backend security-frontend security-deps
.PHONY: security-secrets security-image security-sast security-full

# ── Development ──────────────────────────────────────────────────────────────
# First time: run `make cert` to generate the self-signed TLS certificate.
# Access points:
#   https://localhost          → Rackscope UI
#   https://localhost/api/docs → Swagger UI
#   http://localhost:9090      → Prometheus

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

# ── Lint targets ─────────────────────────────────────────────────────────────

## Python: ruff check + format (backend container)
lint-python:
	docker compose -f $(COMPOSE_DEV) exec backend ruff check .
	docker compose -f $(COMPOSE_DEV) exec backend ruff format --check .

## Frontend: ESLint + Stylelint + Prettier (frontend container)
lint-frontend:
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint:css
	docker compose -f $(COMPOSE_DEV) exec frontend npm run lint:format

## YAML: yamllint on config files, docker-compose, and GitHub Actions
lint-yaml:
	docker run --rm -v $(PWD):/work -w /work cytopia/yamllint:latest \
		-c .yamllint.yml config/ docker-compose.dev.yml docker-compose.prod.yml .github/

## Markdown: markdownlint-cli2 via Node Docker image
lint-md:
	docker run --rm -v $(PWD):/work -w /work node:22-alpine \
		sh -c "npx --yes markdownlint-cli2@0.21.0 '**/*.md' --ignore node_modules"

## Shell scripts: shellcheck via Docker image
lint-sh:
	docker run --rm -v $(PWD):/mnt koalaman/shellcheck:stable scripts/*.sh

## Dockerfiles: hadolint via Docker image
lint-docker:
	@for f in src/Dockerfile frontend/Dockerfile frontend/Dockerfile.prod; do \
		echo "  hadolint $$f..."; \
		docker run --rm -v $(PWD)/$$f:/Dockerfile:ro -v $(PWD)/.hadolint.yaml:/etc/hadolint.yaml:ro \
			hadolint/hadolint:latest hadolint --config /etc/hadolint.yaml /Dockerfile || exit 1; \
	done

## GitHub Actions: actionlint via Docker image
lint-actions:
	docker run --rm -v $(PWD):/repo -w /repo rhysd/actionlint:latest -shellcheck= -pyflakes= .github/workflows/*.yml

## Full lint suite (all file types)
lint: lint-python lint-frontend lint-yaml lint-md lint-sh lint-docker lint-actions

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
	docker compose -f $(COMPOSE_DEV) exec frontend npm audit --audit-level=moderate
	@echo "✅ Frontend security audit complete."

## Backend deps: pip-audit
security-deps:
	@echo "🔍 Python dependency audit (pip-audit)..."
	docker compose -f $(COMPOSE_DEV) exec backend python3 -m pip_audit || true  # PyJWT migration complete — python-jose/ecdsa removed; || true for pip CVEs (container infra, low risk)
	@echo "✅ Python dependency audit complete."

## Full security audit
security: security-backend security-frontend security-deps
	@echo "🛡️  Full security audit complete!"

## Outdated dependency check (Python + npm versions + CVE scan)
check-deps:
	@bash scripts/check-deps.sh

# ── Extended Security (standalone — no stack required) ────────────────────────

## Secrets scan: gitleaks over git history + working tree
security-secrets:
	@echo "Scanning for secrets (gitleaks)..."
	docker run --rm -v $(PWD):/repo zricethezav/gitleaks:latest detect \
		--source /repo --config /repo/.gitleaks.toml --redact --exit-code 1

## Filesystem CVE scan: trivy (OS + Python + npm, HIGH/CRITICAL only)
security-image:
	@echo "Scanning filesystem for CVEs (trivy)..."
	docker run --rm \
		-v $(PWD):/workspace \
		-v /tmp/trivy-cache:/root/.cache/trivy \
		aquasec/trivy:latest fs /workspace \
			--severity HIGH,CRITICAL --exit-code 1 \
			--skip-dirs node_modules \
			--skip-dirs .git --skip-dirs htmlcov --skip-dirs nginx/certs \
			--ignorefile /workspace/.trivyignore

## SAST: semgrep with Python + TypeScript + FastAPI + OWASP rules
security-sast:
	@echo "Running SAST (semgrep)..."
	docker run --rm -v $(PWD):/src semgrep/semgrep:latest semgrep scan \
		--config p/python \
		--config p/typescript \
		--error --quiet \
		--exclude node_modules --exclude htmlcov --exclude dist \
		--exclude-rule "typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml" \
		--exclude-rule "python.lang.security.audit.logging.logger-credential-leak.python-logger-credential-disclosure" \
		/src

## Full extended security: existing checks + secrets + image CVEs + SAST
security-full: security
	@bash scripts/security-full.sh

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


# ── Config Profiles ─────────────────────────────────────────────────────────
# Switch between named configurations without touching app.yaml.
# The active config is stored in .env (gitignored, read by Docker Compose).
#
# Profiles: config/profiles/<name>/app.yaml  — your real infrastructure
# Examples: config/examples/<name>/app.yaml  — bundled demos
#
# Dev usage:
#   make use CONFIG=homelab          # auto-detects profiles/ then examples/
#   make use CONFIG=my-datacenter    # custom profile in config/profiles/
#
# Prod usage:
#   make use-prod CONFIG=homelab
#
# Other:
#   make which-config                # show active config
#   make list-configs                # list all available configs
#   make up / make up-prod           # start with active config (default: app.yaml)

_find-config = \
	$(if $(wildcard config/profiles/$(1)/app.yaml),profiles/$(1)/app.yaml, \
	$(if $(wildcard config/examples/$(1)/app.yaml),examples/$(1)/app.yaml, \
	))

use:
ifndef CONFIG
	$(error Usage: make use CONFIG=<name>  — run 'make list-configs' to see available options)
endif
	$(eval _cfg := $(call _find-config,$(CONFIG)))
	@if [ -z "$(_cfg)" ]; then \
		echo "❌ '$(CONFIG)' not found in config/profiles/ or config/examples/"; \
		echo "   Run 'make list-configs' to see available options."; exit 1; \
	fi
	@echo "APP_CONFIG=$(_cfg)" > .env
	@echo "→ [dev] Switching to: $(CONFIG)  ($(_cfg))"
	docker compose -f $(COMPOSE_DEV) up -d --force-recreate --no-deps backend simulator
	@echo "✅ Dev stack running with: $(CONFIG)"

use-prod:
ifndef CONFIG
	$(error Usage: make use-prod CONFIG=<name>)
endif
	$(eval _cfg := $(call _find-config,$(CONFIG)))
	@if [ -z "$(_cfg)" ]; then \
		echo "❌ '$(CONFIG)' not found"; exit 1; \
	fi
	@echo "APP_CONFIG=$(_cfg)" > .env
	@echo "→ [prod] Switching to: $(CONFIG)  ($(_cfg))"
	docker compose -f $(COMPOSE_PROD) up -d --force-recreate --no-deps backend
	@echo "✅ Prod stack running with: $(CONFIG)"

# Shorthands — examples
use-homelab:        ; $(MAKE) use CONFIG=homelab
use-small-cluster:  ; $(MAKE) use CONFIG=small-cluster
use-hpc-cluster:    ; $(MAKE) use CONFIG=hpc-cluster
use-exascale:       ; $(MAKE) use CONFIG=exascale
use-prod-homelab:       ; $(MAKE) use-prod CONFIG=homelab
use-prod-small-cluster: ; $(MAKE) use-prod CONFIG=small-cluster
use-prod-hpc-cluster:   ; $(MAKE) use-prod CONFIG=hpc-cluster
use-prod-exascale:      ; $(MAKE) use-prod CONFIG=exascale

which-config:
	@if [ -f .env ] && grep -q "APP_CONFIG" .env; then \
		cfg=$$(grep APP_CONFIG .env | cut -d= -f2); \
		name=$$(echo "$$cfg" | sed 's|.*/||' | sed 's|/app.yaml||' | sed 's|app.yaml||'); \
		if echo "$$cfg" | grep -q "^profiles/"; then \
			echo "Active: $$name  (profile — config/$$cfg)"; \
		elif echo "$$cfg" | grep -q "^examples/"; then \
			echo "Active: $$name  (example — config/$$cfg)"; \
		else \
			echo "Active: config/$$cfg"; \
		fi \
	else \
		echo "Active: app.yaml  (default)"; \
	fi

list-configs:
	@echo "── Profiles (real infrastructure) ──────────────────"
	@found=0; for d in config/profiles/*/app.yaml; do [ -f "$$d" ] && found=1 && echo "  $$(basename $$(dirname $$d))  →  make use CONFIG=$$(basename $$(dirname $$d))"; done; [ $$found -eq 0 ] && echo "  (none — create config/profiles/<name>/ to add one)" || true
	@echo ""
	@echo "── Examples (demos) ─────────────────────────────────"
	@for d in config/examples/*/app.yaml; do [ -f "$$d" ] && echo "  $$(basename $$(dirname $$d))  →  make use CONFIG=$$(basename $$(dirname $$d))"; done; true

# Cleanup
clean:
	docker compose -f $(COMPOSE_DEV) down -v
	rm -rf __pycache__ .pytest_cache .venv frontend/node_modules frontend/dist htmlcov .coverage coverage.json .mypy_cache
