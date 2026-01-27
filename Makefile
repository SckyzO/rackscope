SHELL := /bin/bash

.PHONY: up down restart logs build lint test clean

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

# Local Quality Tools (Requires local venv if not using docker exec)
lint:
	docker compose exec backend ruff check .
	docker compose exec backend ruff format --check .
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run lint:css
	docker compose exec frontend npm run lint:format

test:
	docker compose exec backend pytest

clean:
	docker compose down -v
	rm -rf __pycache__ .pytest_cache .venv frontend/node_modules
