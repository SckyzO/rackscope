SHELL := /bin/bash

.PHONY: venv install fmt lint test run

venv:
	python -m venv .venv

install:
	. .venv/bin/activate && pip install -e '.[dev]'

fmt:
	. .venv/bin/activate && ruff format .

lint:
	. .venv/bin/activate && ruff check .

test:
	. .venv/bin/activate && pytest -q

run:
	. .venv/bin/activate && python -m rackscope
