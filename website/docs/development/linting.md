---
id: linting
title: Linting
sidebar_position: 4
---

# Linting

Rackscope uses **9 linters** covering every file type in the repository. All run via a single command:

```bash
make lint
```

The stack is running (`make up`) is required — linters execute inside Docker containers, no host installation needed.

---

## Quick reference

| Linter | Target | Make target | Config file |
|---|---|---|---|
| **ruff** | Python source + tests | `make lint-python` | `pyproject.toml [tool.ruff]` |
| **ESLint 10** | TypeScript / TSX | `make lint-frontend` | `frontend/eslint.config.js` |
| **Stylelint 17** | CSS | `make lint-frontend` | `frontend/.stylelintrc.json` |
| **Prettier** | TS/TSX/CSS/JSON format | `make lint-frontend` | `frontend/.prettierrc.json` |
| **yamllint** | YAML config files + CI | `make lint-yaml` | `.yamllint.yml` |
| **markdownlint-cli2** | Docs markdown | `make lint-md` | `.markdownlint.jsonc` |
| **shellcheck** | Shell scripts | `make lint-sh` | *(inline flags)* |
| **hadolint** | Dockerfiles | `make lint-docker` | `.hadolint.yaml` |
| **actionlint** | GitHub Actions workflows | `make lint-actions` | *(inline flags)* |

---

## Python — ruff

[ruff](https://docs.astral.sh/ruff/) replaces flake8 + isort + pyupgrade in a single fast tool.

```bash
make lint-python
# runs inside backend container:
#   ruff check .
#   ruff format --check .
```

Configuration lives in `pyproject.toml` under `[tool.ruff]`. Key settings:
- `line-length = 100`
- Enabled rule sets: `E`, `F`, `I` (isort), `W`
- `src = ["src", "plugins", "tests"]`

**Auto-fix:**
```bash
docker compose -f docker-compose.dev.yml exec backend ruff check . --fix
docker compose -f docker-compose.dev.yml exec backend ruff format .
```

---

## TypeScript — ESLint 10 + type-aware

ESLint 10 runs with **full type-awareness** via `typescript-eslint`, meaning it reads the TypeScript type graph to catch bugs that syntax-only linters miss.

```bash
make lint-frontend
# runs: npm run lint (ESLint) + npm run lint:css (Stylelint) + npm run lint:format (Prettier)
```

### Why type-aware?

Type-aware rules catch real bugs:

| Rule | What it catches |
|---|---|
| `no-floating-promises` | `async` calls where the returned Promise is never awaited or caught |
| `no-misused-promises` | `async` function passed where `void` is expected (e.g. wrong event handler shape) |
| `await-thenable` | `await` used on a non-Promise value |
| `prefer-nullish-coalescing` | `a \|\| b` where `??` is semantically correct (type is `T \| null \| undefined`) |
| `no-unnecessary-type-assertion` | Useless `as Type` casts that TypeScript already knows |

### Active rule sets (`eslint.config.js`)

```
js.configs.recommended              — standard JS rules
tseslint.configs.recommendedTypeChecked  — TS + type-aware safety rules
tseslint.configs.stylisticTypeChecked    — consistency (prefer-includes, array-type…)
reactHooks.configs.flat.recommended — hooks rules (exhaustive-deps)
reactRefresh.configs.vite           — Fast Refresh constraints
eslint-plugin-react (selected)      — jsx-no-target-blank, no-array-index-key, self-closing-comp
```

### Notable custom rules

```js
'no-floating-promises': 'error'
'no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }]
'consistent-type-definitions': ['warn', 'type']   // prefer type over interface
'logical-assignment-operators': ['warn', 'always'] // a ||= b instead of if (!a) a = b
'no-useless-assignment': 'error'
```

### Disabled intentionally

```js
'@typescript-eslint/no-unsafe-*': 'off'  // API responses typed as any — too noisy
'@typescript-eslint/no-unnecessary-condition': 'off'  // false positives in React
```

**Auto-fix:**
```bash
docker compose -f docker-compose.dev.yml exec frontend npx eslint . --fix
docker compose -f docker-compose.dev.yml exec frontend npx prettier --write .
```

---

## CSS — Stylelint 17

Stylelint lints `.css` and `.pcss` files (not Tailwind utility classes — those are handled by Prettier).

Config: `frontend/.stylelintrc.json`

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "import-notation": "string",
    "at-rule-no-unknown": [true, {
      "ignoreAtRules": ["tailwind", "apply", "layer", "theme", "custom-variant"]
    }]
  }
}
```

The `ignoreAtRules` list covers Tailwind v4 directives.

---

## YAML — yamllint

yamllint runs via the `cytopia/yamllint` Docker image — no host installation needed.

```bash
make lint-yaml
```

**Scope:** `config/`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `.github/`

Config: `.yamllint.yml` — key choices:
- `line-length: max: 200, level: warning` (topology files have long lines)
- `document-start: present: false` (GitHub Actions omit `---` by convention)
- `colons: max-spaces-after: -1` (Docker volume paths `host:container` trigger false positives)
- `indentation: disable` (mixed 2-space styles across files)

---

## Markdown — markdownlint-cli2

Scoped to `website/docs/**/*.md` only — internal docs (CLAUDE.md, CHANGELOG.md) use different conventions and are excluded.

```bash
make lint-md
```

Config: `.markdownlint.jsonc` — disabled rules:
- `MD013` — line length (long tables in docs)
- `MD025` — single h1 (Docusaurus front matter + heading pattern)
- `MD033` — inline HTML (Docusaurus JSX/admonitions)
- `MD041` — first-line h1 (front matter files)
- `MD060` — table pipe spacing (Docusaurus style)

---

## Shell scripts — shellcheck

shellcheck runs via the `koalaman/shellcheck:stable` Docker image.

```bash
make lint-sh
# checks: scripts/check-deps.sh, scripts/run-example-tests.sh, scripts/use-example.sh
```

No config file — shellcheck auto-detects shell dialect from the shebang.

**Common patterns fixed:**
- `SC2015` — `A && B || C` → `if A; then B; else C; fi`
- `SC2034` — unused variables removed
- `SC2129` — consecutive `>> file` → `{ ... } >> file`

---

## Dockerfiles — hadolint

hadolint runs via the `hadolint/hadolint:latest` Docker image, one Dockerfile at a time.

```bash
make lint-docker
# checks: src/Dockerfile, frontend/Dockerfile, frontend/Dockerfile.prod, website/Dockerfile
```

Config: `.hadolint.yaml`

```yaml
failure-threshold: error   # warnings are shown but don't fail CI
ignore:
  - DL3008  # apt-get without version pin (convenience trade-off)
  - DL3013  # pip install without version pin (managed by pyproject.toml)
  - DL3046  # useradd without -l (non-critical for our images)
```

---

## GitHub Actions — actionlint

actionlint validates GitHub Actions workflow syntax, action references, expression types, and step outputs.

```bash
make lint-actions
# checks: .github/workflows/*.yml
```

Flags used:
- `-shellcheck=` — disabled: shell scripts in `run:` blocks are handled by `make lint-sh`
- `-pyflakes=` — disabled: no Python in workflows

---

## Dependency checks — `check-deps.sh`

A separate script (not part of `make lint`) checks for outdated packages and CVEs:

```bash
bash scripts/check-deps.sh          # full check
bash scripts/check-deps.sh --python # Python only
bash scripts/check-deps.sh --npm    # npm only
bash scripts/check-deps.sh --cve    # CVE scan only
make check-deps                     # via Makefile
```

What it runs:
1. `pip list --outdated` — Python outdated packages
2. `pip-audit` — Python CVE scan
3. `npm outdated` — npm outdated packages
4. `npm audit` — npm CVE scan

Exit code `0` = clean, `1` = outdated packages or CVEs found.

---

## CI integration

```bash
make ci       # = make quality + make security
make quality  # = make lint + make typecheck + make complexity + make coverage
make security # = make security-backend + make security-frontend + make security-deps
```

The full CI pipeline runs all linters plus type checking, complexity analysis, test coverage, bandit (Python security), and pip-audit/npm audit.

---

## Fixing violations

| Linter | Auto-fix command |
|---|---|
| ruff | `docker compose … exec backend ruff check . --fix && ruff format .` |
| ESLint | `docker compose … exec frontend npx eslint . --fix` |
| Prettier | `docker compose … exec frontend npx prettier --write .` |
| yamllint | Manual only |
| markdownlint | `docker compose … exec frontend npx markdownlint-cli2 '**/*.md' --fix` |
| shellcheck | Manual only |
| hadolint | Manual only |
| actionlint | Manual only |
