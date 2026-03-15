---
id: security
title: Security Audit
sidebar_position: 2
---

# Security Audit

Rackscope runs automated security scanning on every push, every pull request, and weekly via GitHub Actions (`.github/workflows/security.yml`).

## Run locally

```bash
make security           # Full audit: bandit + npm audit + pip-audit
make security-backend   # Python SAST only
make security-frontend  # npm dependency audit only
make security-deps      # Python dependency audit only
```

The stack must be running (`make up`) before running these commands.

---

## Tools

### bandit — Python static analysis

[bandit](https://bandit.readthedocs.io/) scans Python source code for common security issues: hardcoded credentials, unsafe deserialization, dangerous function calls, weak cryptography, etc.

```bash
make security-backend
```

bandit scans every `.py` file under `src/rackscope/` and reports findings by severity (**Low / Medium / High**) and confidence (**Low / Medium / High**).

The `make security-backend` command uses the `-ll` flag, which reports **Medium and High** severity only. Low findings are visible if you run bandit directly without `-ll`:

```bash
docker compose -f docker-compose.dev.yml exec backend python3 -m bandit -r src/rackscope
```

**What bandit checks (examples):**

| Rule | What it detects |
|---|---|
| `B101` | `assert` statements (stripped in optimised bytecode) |
| `B105/B106/B107` | Hardcoded password strings |
| `B110/B112` | Silent `except: pass` / `except: continue` |
| `B201/B202` | Flask debug mode, SQL injection |
| `B301–B315` | Unsafe pickle, XML, YAML, marshal |
| `B501–B510` | Weak TLS/SSL configuration |
| `B601–B612` | Shell injection, subprocess misuse |

---

### npm audit — Frontend dependency scan

[npm audit](https://docs.npmjs.com/cli/commands/npm-audit) checks all frontend dependencies (including transitive) against the GitHub Advisory Database for known CVEs.

```bash
make security-frontend
```

The command runs `npm audit --audit-level=high`, which exits with a non-zero code only if **High or Critical** vulnerabilities are found. Moderate and Low findings are reported but do not fail the build.

To see the full report:

```bash
docker compose -f docker-compose.dev.yml exec frontend npm audit
```

To attempt automatic fixes:

```bash
docker compose -f docker-compose.dev.yml exec frontend npm audit fix
```

> Note: some fixes require `--force` when they involve breaking semver changes. Always test after running `npm audit fix --force`.

---

### pip-audit — Python dependency scan

[pip-audit](https://pypi.org/project/pip-audit/) checks installed Python packages against the [OSV vulnerability database](https://osv.dev/) for known CVEs.

```bash
make security-deps
```

pip-audit inspects the packages installed in the backend container and reports any package with a known vulnerability, the affected version range, and the fixed version.

---

## Severity policy

| Severity | CI behaviour | Action |
|---|---|---|
| **Critical** | ❌ Blocks merge | Fix before any release |
| **High** | ❌ Blocks merge | Fix within current sprint — document exception if deferred |
| **Moderate** | ⚠️ Warning only | Fix before next minor release |
| **Low** | ✅ Non-blocking | Informational — track in issues |

---

## GitHub Actions

The security workflow runs:

- On every **push to `main`**
- On every **pull request to `main`**
- **Weekly** on Monday at 08:00 UTC — catches newly disclosed CVEs in unchanged code

Each job uploads its report as a build artifact, downloadable from the Actions tab.
