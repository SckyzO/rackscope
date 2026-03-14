#!/usr/bin/env bash
# security-full.sh — Extended security scan: secrets + image CVEs + SAST
#
# Runs standalone (no 'make up' needed) — all tools run via Docker images.
# Complements 'make security' which requires the dev stack running.
#
# Usage:
#   bash scripts/security-full.sh            # all checks
#   bash scripts/security-full.sh --secrets  # gitleaks only
#   bash scripts/security-full.sh --image    # trivy only
#   bash scripts/security-full.sh --sast     # semgrep only
#
# Exit code: 0 = clean, 1 = findings requiring attention

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

RUN_SECRETS=true
RUN_IMAGE=true
RUN_SAST=true

for arg in "$@"; do
  case $arg in
    --secrets) RUN_IMAGE=false; RUN_SAST=false ;;
    --image)   RUN_SECRETS=false; RUN_SAST=false ;;
    --sast)    RUN_SECRETS=false; RUN_IMAGE=false ;;
  esac
done

PASS=0
FAIL=0

sep()    { printf '%s\n' "────────────────────────────────────────────────────────────"; }
header() { echo -e "\n${BOLD}${CYAN}$1${RESET}"; sep; }
ok()     { echo -e "  ${GREEN}✔${RESET}  $1"; PASS=$((PASS+1)); }
fail()   { echo -e "  ${RED}✘${RESET}  $1"; FAIL=$((FAIL+1)); }
# warn() available for future use

# ══════════════════════════════════════════════════════════════════════════════
# 1. Secrets scanning — gitleaks
# ══════════════════════════════════════════════════════════════════════════════
if $RUN_SECRETS; then
  header "Secrets scan (gitleaks)"
  echo "Scanning git history and working tree for accidentally committed secrets…"

  if docker run --rm \
      -v "$(pwd):/repo" \
      zricethezav/gitleaks:latest detect \
        --source /repo \
        --config /repo/.gitleaks.toml \
        --redact \
        --exit-code 1 \
        2>&1; then
    ok "No secrets detected"
  else
    fail "Secrets or credentials found — review gitleaks output above"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# 2. Filesystem + dependency CVE scan — trivy
# ══════════════════════════════════════════════════════════════════════════════
if $RUN_IMAGE; then
  header "Filesystem CVE scan (trivy)"
  echo "Scanning filesystem for vulnerabilities (OS packages, Python, npm)…"

  if docker run --rm \
      -v "$(pwd):/workspace" \
      -v /tmp/trivy-cache:/root/.cache/trivy \
      aquasec/trivy:latest fs /workspace \
        --severity HIGH,CRITICAL \
        --exit-code 1 \
        --skip-dirs node_modules \
        --skip-dirs .git \
        --skip-dirs htmlcov \
        --ignorefile /workspace/.trivyignore \
        2>&1; then
    ok "No HIGH/CRITICAL CVEs found in filesystem"
  else
    fail "HIGH or CRITICAL CVEs found — review trivy output above"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# 3. Static Application Security Testing — semgrep
# ══════════════════════════════════════════════════════════════════════════════
if $RUN_SAST; then
  header "SAST (semgrep)"
  echo "Running static analysis with Python + TypeScript + OWASP rules…"

  if docker run --rm \
      -v "$(pwd):/src" \
      semgrep/semgrep:latest scan \
        --config p/python \
        --config p/typescript \
        --config p/fastapi-security \
        --config p/owasp-top-ten \
        --error \
        --quiet \
        --exclude "node_modules" \
        --exclude "htmlcov" \
        --exclude "dist" \
        /src 2>&1; then
    ok "No semgrep findings"
  else
    fail "Semgrep security issues found — review output above"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
echo ""
sep
echo -e "${BOLD}Security scan summary${RESET}"
sep
echo -e "  ${GREEN}✔${RESET}  Passed: ${PASS}"
if [ "$FAIL" -gt 0 ]; then
  echo -e "  ${RED}✘${RESET}  Failed: ${FAIL}"
fi
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Action required: review findings above.${RESET}"
  exit 1
else
  echo -e "${GREEN}All security checks passed.${RESET}"
  exit 0
fi
