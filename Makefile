SHELL := /bin/bash

.PHONY: up down restart logs build lint test clean coverage typecheck complexity quality shell-backend shell-frontend watch-logs

# Docker Stack Management
up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

build:
	docker compose build

# Code Quality Tools
lint:
	docker compose exec backend ruff check .
	docker compose exec backend ruff format --check .
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run lint:css
	docker compose exec frontend npm run lint:format

test:
	docker compose exec backend pytest

coverage:
	docker compose exec backend pytest --cov=rackscope --cov-report=term --cov-report=html
	@echo "Coverage report generated: htmlcov/index.html"

typecheck:
	docker compose exec backend /home/appuser/.local/bin/mypy src/rackscope

complexity:
	docker compose exec backend /home/appuser/.local/bin/radon cc src/rackscope -a -nc

quality: lint typecheck complexity coverage
	@echo "✅ All quality checks complete!"

# Development Helpers
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

watch-logs:
	docker compose logs -f backend frontend

# Cleanup
clean:
	docker compose down -v
	rm -rf __pycache__ .pytest_cache .venv frontend/node_modules htmlcov .coverage .mypy_cache
