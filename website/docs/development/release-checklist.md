---
id: release-checklist
title: Release Checklist
sidebar_position: 5
---

# Release Checklist

This document defines the mandatory steps before tagging any **pre-stable** (`1.x.0-beta`) or **stable** (`1.x.0`) release. Work through every section in order. Do not skip steps — each gate catches a different class of defect.

---

## 1. Code Quality

All checks run inside Docker containers. The stack must be running (`make up`).

```bash
make lint        # 9 linters: ruff, ESLint, Stylelint, Prettier,
                 # yamllint, markdownlint, shellcheck, hadolint, actionlint
make typecheck   # mypy — 0 type errors
make test        # pytest — 0 failures
make coverage    # coverage report — target ≥ 70 %
```

Expected results:

- [ ] `make lint` — **0 errors, 0 warnings**
- [ ] `make typecheck` — **0 type errors**
- [ ] `make test` — **all tests pass**
- [ ] `make coverage` — overall coverage **≥ 70 %**

If any check fails, fix the issue before proceeding. Never release with a known failing test.

---

## 2. Security

```bash
make security          # bandit + pip-audit + npm audit (requires make up)
make security-full     # + gitleaks + trivy + semgrep   (standalone)
bash scripts/check-deps.sh  # outdated packages + CVE check
```

- [ ] `make security-backend` — bandit: **0 HIGH / CRITICAL**
- [ ] `make security-deps` — pip-audit: **0 known CVEs**
- [ ] `make security-frontend` — npm audit: **0 critical CVEs**
- [ ] `make security-secrets` — gitleaks: **0 secrets detected**
- [ ] `make security-image` — trivy: **0 HIGH/CRITICAL unignored CVEs**
- [ ] `make security-sast` — semgrep: **0 findings**
- [ ] `bash scripts/check-deps.sh` — review any outdated packages, update if safe

Known accepted findings (document any new ones in `.trivyignore` or `.gitleaks.toml` with justification).

---

## 3. Build

Rebuild all containers from scratch to catch dependency issues that the running containers might hide.

```bash
make down
make build       # docker compose build — no cache if uncertain: add --no-cache
make up
```

- [ ] `make build` completes **without errors**
- [ ] `make up` — all containers start (`docker compose ps`: backend, frontend, prometheus healthy)
- [ ] `make logs` — **no ERROR or CRITICAL** lines in the first 30 seconds after startup

---

## 4. Smoke Tests (Manual)

With the freshly built stack running, verify the core flows manually. These are not covered by automated tests because they require browser interaction.

### Navigation

- [ ] Sidebar loads correctly (all links present, plugin menu if slurm/simulator enabled)
- [ ] Dashboard loads without console errors
- [ ] Settings page opens and saves (change a value, verify it persists after reload)

### Logs page

- [ ] `/logs` opens and Live mode streams entries in real-time
- [ ] Level filter (INFO/WARNING/ERROR) works
- [ ] Reverse order toggle works
- [ ] Export downloads a valid JSON file
- [ ] Clear empties the buffer

### Auth (when `auth.enabled: true`)

- [ ] Login with correct credentials succeeds, JWT stored
- [ ] Login with wrong password returns 401 (no stack trace leaked)
- [ ] Protected routes redirect to `/auth/signin` when logged out
- [ ] Session persists across page refresh

### API endpoints

```bash
curl http://localhost:8000/healthz                   # {"status": "ok"}
curl http://localhost:8000/api/stats/global          # JSON with total_rooms etc.
curl http://localhost:8000/api/logs?n=10             # ring buffer contents
curl http://localhost:8000/api/system/process-stats  # memory/CPU stats
```

- [ ] All 4 endpoints return **200** with expected JSON shape

---

## 5. Full CI Pipeline

```bash
make ci   # = make quality + make security
```

This is the single command that blocks releases in GitHub Actions. Run it locally before tagging.

- [ ] `make ci` — **exits 0**

---

## 6. Documentation

- [ ] `CHANGELOG.md` updated with all changes since last release (use `git log --oneline <last-tag>..HEAD`)
- [ ] Version references in docs match the new version (`website/docs/`)
- [ ] Any new `app.yaml` config keys documented in `admin-guide/app-yaml.md`
- [ ] Any new API endpoints documented in `api-reference/`
- [ ] New features documented in the appropriate user guide page

---

## 7. Version Bump

Update version in exactly two files:

```bash
# pyproject.toml
version = "X.Y.Z"           # or "X.Y.Z-beta" for pre-stable

# frontend/package.json
"version": "X.Y.Z"
```

- [ ] `pyproject.toml` version updated
- [ ] `frontend/package.json` version updated
- [ ] `README.md` test count badge updated (change `974%2B` to current count)
- [ ] Commit: `chore(release): bump version to vX.Y.Z`

---

## 8. Git Tag

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z — <one-line summary>"
git push origin vX.Y.Z
```

Naming convention:

| Type | Format | Example |
|---|---|---|
| Pre-stable (beta) | `vX.Y.Z-beta.N` | `v1.0.0-beta.3` |
| Stable release | `vX.Y.Z` | `v1.1.0` |
| Patch / hotfix | `vX.Y.Z` | `v1.0.1` |

- [ ] Tag created and pushed to `origin`
- [ ] GitHub release created with tag (paste relevant CHANGELOG section as description)

---

## 9. Push to Production Repository

The development repository (`rackscope_dev`) diverges from the public repository (`rackscope`). Sync on every release:

```bash
git remote add prod git@github.com:SckyzO/rackscope.git  # first time only
git push prod main
git push prod vX.Y.Z
```

- [ ] `main` branch pushed to prod repo
- [ ] Tag pushed to prod repo
- [ ] GitHub Actions on prod repo pass (CI + security workflows)

---

## 10. Post-release

- [ ] Smoke-test the prod repo tag (checkout, `make build`, `make up`, verify `/healthz`)
- [ ] Update `STATUS.md` with new version and test count
- [ ] Announce in relevant channels if applicable

---

## Quick reference

```bash
# Full release gate in one shot
make down && make build && make up && make ci && bash scripts/security-full.sh
```

If this command exits 0, the codebase is ready to tag.

---

## Checklist template (copy-paste)

```
Release vX.Y.Z — $(date +%Y-%m-%d)

### Code Quality
- [ ] make lint           — 0 errors 0 warnings
- [ ] make typecheck      — 0 type errors
- [ ] make test           — all pass
- [ ] make coverage       — ≥ 70%

### Security
- [ ] make security       — 0 critical
- [ ] make security-full  — gitleaks + trivy + semgrep clean
- [ ] check-deps.sh       — 0 critical CVEs

### Build & Smoke
- [ ] make build          — no errors
- [ ] make up             — all containers healthy
- [ ] make logs           — no ERROR at startup
- [ ] Dashboard loads
- [ ] Settings save/reload
- [ ] Logs page live mode
- [ ] API /healthz → 200

### Release
- [ ] CHANGELOG updated
- [ ] Version bumped (pyproject.toml + package.json)
- [ ] make ci → exit 0
- [ ] git tag vX.Y.Z pushed
- [ ] Pushed to prod repo
```
