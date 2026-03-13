# Rackscope — Security Audit Prompt

Use this prompt with Claude Code (or any AI assistant) to run a full security
audit of the Rackscope codebase. Work through each section systematically,
reading the relevant files before assessing each control.

---

## Context

**Stack:**
- Backend: Python 3.12 / FastAPI / Pydantic v2 / PyJWT / bcrypt / httpx
- Frontend: React 19 / TypeScript / Vite / Monaco Editor
- Infrastructure: Docker Compose, file-based config (YAML), optional JWT auth
- Key attack surfaces: REST API, file upload (avatar), YAML config editor,
  Prometheus URL, topology mutation endpoints, auth system

**Threat model:**
- Rackscope is a self-hosted internal tool (datacenter NOC)
- Primary risk: insider threat / misconfigured deployment exposed to LAN or internet
- No multi-tenancy — single admin user
- Secrets: JWT signing key, Prometheus basic auth credentials, bcrypt password hash

---

## How to Run the Automated Checks First

```bash
make security          # bandit + pip-audit + npm audit
scripts/check-deps.sh  # outdated packages (Python + npm)
make ci                # full CI pipeline: quality + security
```

---

## Audit Checklist

For each control, state: PASS / WARN / FAIL / N/A

---

### 1. OWASP A01 — Broken Access Control

Files: middleware.py, dependencies.py, routers/system.py, routers/config.py, app.py

- [ ] Are all mutating endpoints (POST/PUT/DELETE) protected by require_admin or JWT?
- [ ] Is GET /api/system/process-stats intentionally public?
- [ ] Are GET /api/config and topology reads protected when auth.enabled=true?
- [ ] Is require_admin injected on PUT /api/config and POST /api/system/restart?
- [ ] Are there any endpoints exposing sensitive data without auth?
- [ ] Does the frontend enforce route guards (redirect to login)?

---

### 2. OWASP A02 — Cryptographic Failures

Files: routers/auth.py, middleware.py, model/config.py, api/app.py

- [ ] Is bcrypt used with cost factor >= 12?
- [ ] Is JWT algorithm pinned to HS256? Is "alg: none" possible?
- [ ] Is AUTH_RUNTIME_SECRET generated with secrets.token_hex (CSPRNG)?
- [ ] Is Prometheus basic_auth_password excluded from GET /api/config responses?
- [ ] Are JWT tokens ever logged?

---

### 3. OWASP A03 — Injection

Files: utils/validation.py, routers/topology.py, telemetry/prometheus.py, telemetry/planner.py

- [ ] Are all topology path params validated with assert_safe_id before filesystem use?
- [ ] Can $instances placeholder replacement in PromQL be exploited?
      (instance name containing | or .* to escape the regex)
- [ ] Is prometheus_url validated to prevent SSRF?
- [ ] Are YAML files written with yaml.safe_dump (not yaml.dump)?
- [ ] Can a crafted topology YAML trigger code execution via yaml.safe_load?

---

### 4. OWASP A04 — Insecure Design

Files: routers/auth.py, model/config.py, routers/system.py

- [ ] Is the login rate limiter bypass-able (IP rotation, server restart resets dict)?
- [ ] Are default password policy settings (min_length=6, no digit/symbol) acceptable?
- [ ] Is the restart endpoint DoS-able without auth when trusted_networks is empty?
- [ ] Is there a CSRF risk on state-mutating endpoints (no CSRF token)?
- [ ] Can the avatar endpoint fill the disk (no per-user quota)?

---

### 5. OWASP A05 — Security Misconfiguration

Files: docker-compose.dev.yml, api/app.py, middleware.py, config/app.yaml

- [ ] Is CORS configured restrictively (not wildcard *)?
- [ ] Is FastAPI running in debug mode in production images?
- [ ] Are Docker containers running as non-root?
- [ ] Are there hardcoded secrets in default config files committed to the repo?
- [ ] Is auth.enabled: false the default? Is this documented as unsafe for internet-facing?
- [ ] Are error responses leaking stack traces or internal paths to clients?

---

### 6. OWASP A06 — Vulnerable and Outdated Components

```bash
make security-deps     # pip-audit
make security-frontend # npm audit
scripts/check-deps.sh  # outdated check
```

- [ ] Any critical/high CVEs in Python dependencies?
- [ ] Any critical CVEs in npm dependencies?
- [ ] Are Docker base images pinned to recent versions?
- [ ] Is the d3-color CVE (CVE-2022-26869) mitigated in package.json overrides?

---

### 7. OWASP A07 — Identification and Authentication Failures

Files: routers/auth.py, middleware.py, frontend/src/contexts/AuthContext.tsx

- [ ] Is there account lockout after repeated failures (beyond in-memory rate limit)?
- [ ] Are JWT tokens invalidated on password change? (stateless — no blacklist)
- [ ] Is there a mechanism to invalidate all sessions (rotate secret_key)?
- [ ] Can unauthenticated users enumerate valid usernames via response differences?
- [ ] Is session_duration: unlimited appropriate for production?
- [ ] Is GET /api/auth/me protected against unauthenticated access?

---

### 8. OWASP A08 — Software and Data Integrity Failures

Files: routers/auth.py (_validate_avatar_data_url), model/loader.py

- [ ] Avatar upload validation:
  - MIME type allowlist (no SVG, no HTML, no text)
  - Magic bytes match declared MIME
  - Size limit (512 KB) enforced
  - Fixed server-side storage path (no filename from user)
- [ ] Is YAML loaded with yaml.safe_load everywhere (no yaml.full_load)?
- [ ] Are topology YAMLs validated against Pydantic schemas before apply?
- [ ] Are there eval() / exec() calls on user-controlled data?

---

### 9. OWASP A09 — Security Logging and Monitoring Failures

Files: middleware.py (RequestLoggingMiddleware), logging_config.py, routers/auth.py

- [ ] Are failed auth attempts logged with timestamp and IP?
- [ ] Are successful logins logged?
- [ ] Are topology mutations (create/delete) logged?
- [ ] Are admin actions (restart, config update, avatar upload) logged?
- [ ] Are log entries structured JSON with request_id for correlation?
- [ ] Are passwords/tokens present in any log output?

---

### 10. OWASP A10 — Server-Side Request Forgery (SSRF)

Files: telemetry/prometheus.py, routers/config.py, model/config.py

- [ ] Is prometheus_url validated to only allow http/https schemes?
- [ ] Can an admin set prometheus_url to http://169.254.169.254/ (cloud metadata)?
- [ ] Are redirects followed blindly in httpx calls to Prometheus?
- [ ] Is there a URL scheme allowlist on any user-supplied URL?

---

### 11. File System Security

Files: routers/topology.py, utils/validation.py, routers/auth.py

- [ ] Is assert_safe_id applied to ALL parameters that become path segments?
- [ ] Is shutil.rmtree called on paths constructed from validated user input only?
- [ ] Can the avatar storage path (_avatar_path) be influenced by request data?
- [ ] Are there symlink traversal risks in the config directory?

---

### 12. Frontend Security

Files: frontend/src/services/api.ts, AuthContext.tsx, pages/editors/

- [ ] Are JWT tokens in localStorage (XSS risk) or httpOnly cookies?
- [ ] Is user-controlled content rendered with dangerouslySetInnerHTML anywhere?
- [ ] Does the Monaco editor have code execution capabilities enabled?
- [ ] Are API error messages displayed verbatim (potential info leakage)?
- [ ] Is a Content Security Policy (CSP) header configured?

---

### 13. Container and Infrastructure Security

Files: Dockerfile, frontend/Dockerfile, docker-compose.dev.yml

- [ ] Do containers run as non-root user?
- [ ] Are volumes mounted read-only where possible?
- [ ] Are ports unnecessarily exposed to host (simulator port 9000)?
- [ ] Are Docker image layers minimal (no build tools in production)?
- [ ] Is .dockerignore preventing secrets from entering images?

---

## Output Format

Produce a findings table per section:

| Control | Status | Finding | Recommendation |
|---------|--------|---------|----------------|
| JWT alg pinned | PASS | HS256 hardcoded | — |
| Prometheus SSRF | WARN | No URL scheme validation | Validate scheme is http/https only |
| Login rate limit | WARN | In-memory, resets on restart | Document limitation; consider persistent store |

Then a prioritized summary:

- **Critical** (fix before next release):
- **High** (fix in current sprint):
- **Medium** (backlog):
- **Low / Informational**:
