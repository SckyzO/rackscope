---
id: security
title: Security Audit
sidebar_position: 2
---

# Security Audit

Rackscope uses automated security scanning on every push and weekly via GitHub Actions.

## Run locally

```bash
make security           # Full audit: bandit + npm audit + pip-audit
make security-backend   # Python SAST only (bandit)
make security-frontend  # npm audit only
make security-deps      # Python dependency audit (pip-audit)
```

The stack must be running (`make up`) before running these commands.

## Tools

### Backend — bandit (Python SAST)

[bandit](https://bandit.readthedocs.io/) scans Python source for common security issues. The `-ll` flag reports Medium and High severity only — Low findings are informational.

```bash
make security-backend
```

**Current status**: ✅ 0 high/medium issues in `src/rackscope/`

Known Low-severity findings (not suppressed, not blocking):

| Rule | Location | Why it's acceptable |
|---|---|---|
| `B101` (assert) | `model/loader.py` | Internal type invariant on a dict we just constructed — never user-controlled |
| `B110` (try/except/pass) | `routers/auth.py`, `routers/plugins.py` | Non-critical path — config reloads on next startup |
| `B112` (try/except/continue) | `routers/catalog.py` | Skips malformed YAML files safely |
| `B105` (hardcoded password) | `routers/config.py` | False positive — default value is `None` |

These findings are left as-is in the code (no inline `# nosec` suppression, no global config skips). They surface on `make security` without the `-ll` flag but do not block CI.

### Frontend — npm audit

```bash
make security-frontend
```

**Current status**: ⚠️ 5 high in `react-simple-maps` d3 dependencies (tracked in [#4](https://github.com/SckyzO/rackscope/issues/4))

These vulnerabilities affect d3 color/data parsing. In Rackscope, all data comes from internal Prometheus/topology sources — no user-controlled input reaches these paths. Risk is low in practice.

### Python dependencies — pip-audit

```bash
make security-deps
```

Scans `pyproject.toml` dependencies against the OSV vulnerability database.

## GitHub Actions

Security runs automatically:

- **On every push to `main`**
- **On every pull request to `main`**
- **Weekly** (Monday 08:00 UTC) — catches newly disclosed CVEs

Workflow: `.github/workflows/security.yml`

Reports are uploaded as artifacts on each run.

## Severity policy

| Severity | Policy |
|---|---|
| **Critical** | Block merge immediately — fix before any release |
| **High** | Fix within current sprint — document exceptions in this file |
| **Moderate** | Fix before next minor release |
| **Low** | Informational — no suppression, no blocking |
