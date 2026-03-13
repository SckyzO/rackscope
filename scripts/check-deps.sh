#!/usr/bin/env bash
# check-deps.sh — Check Python and npm packages for outdated versions and CVEs.
# Runs inside Docker containers (requires: make up).
#
# Usage:
#   scripts/check-deps.sh           # full check
#   scripts/check-deps.sh --python  # Python only
#   scripts/check-deps.sh --npm     # npm only
#   scripts/check-deps.sh --cve     # CVE scan only (pip-audit + npm audit)
#
# Exit code: 0 = all good, 1 = outdated or CVEs found

set -euo pipefail

COMPOSE="docker compose -f docker-compose.dev.yml"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

RUN_PYTHON=true
RUN_NPM=true
RUN_CVE=true

for arg in "$@"; do
  case $arg in
    --python) RUN_NPM=false; RUN_CVE=false ;;
    --npm)    RUN_PYTHON=false; RUN_CVE=false ;;
    --cve)    RUN_PYTHON=false; RUN_NPM=false ;;
  esac
done

PYTHON_OUTDATED=0
NPM_OUTDATED=0
CVE_FOUND=0

sep() { printf '%s\n' "────────────────────────────────────────────────────────────"; }

header() { echo -e "\n${BOLD}${CYAN}$1${RESET}"; sep; }

# ── Check stack is running ─────────────────────────────────────────────────

if ! $COMPOSE ps --services --filter "status=running" 2>/dev/null | grep -q "backend"; then
  echo -e "${RED}ERROR: Backend container is not running. Run 'make up' first.${RESET}"
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
# PYTHON — Outdated packages
# ══════════════════════════════════════════════════════════════════════════════

if $RUN_PYTHON; then
  header "Python — Outdated packages (pip list --outdated)"

  OUTDATED=$($COMPOSE exec -T backend pip list --outdated --format=columns 2>/dev/null || true)

  if [ -z "$OUTDATED" ] || [ "$(echo "$OUTDATED" | wc -l)" -le 2 ]; then
    echo -e "${GREEN}All Python packages are up to date.${RESET}"
  else
    echo -e "${YELLOW}Outdated Python packages:${RESET}"
    echo "$OUTDATED"
    PYTHON_OUTDATED=1
  fi

  echo ""
  header "Python — Direct dependencies version check (pyproject.toml)"

  # Show current installed versions of direct deps
  echo -e "${CYAN}Direct dependencies:${RESET}"
  $COMPOSE exec -T backend pip show \
    fastapi pydantic uvicorn httpx pyjwt bcrypt pyyaml \
    2>/dev/null | grep -E "^(Name|Version):" | paste - - | \
    awk '{printf "  %-20s %s\n", $2, $4}'
fi

# ══════════════════════════════════════════════════════════════════════════════
# NPM — Outdated packages
# ══════════════════════════════════════════════════════════════════════════════

if $RUN_NPM; then
  header "npm — Outdated packages (npm outdated)"

  NPM_OUT=$($COMPOSE exec -T frontend npm outdated --color=false 2>/dev/null || true)

  if [ -z "$NPM_OUT" ]; then
    echo -e "${GREEN}All npm packages are up to date.${RESET}"
  else
    echo -e "${YELLOW}Outdated npm packages:${RESET}"
    echo "$NPM_OUT"
    NPM_OUTDATED=1
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# CVE SCANS
# ══════════════════════════════════════════════════════════════════════════════

if $RUN_CVE || $RUN_PYTHON || $RUN_NPM; then
  header "Python CVE scan (pip-audit)"

  PIP_AUDIT=$($COMPOSE exec -T backend python3 -m pip_audit --format=columns 2>&1 || true)

  if echo "$PIP_AUDIT" | grep -qiE "CVE-[0-9]"; then
    echo -e "${RED}CVEs found in Python dependencies:${RESET}"
    echo "$PIP_AUDIT"
    CVE_FOUND=1
  else
    echo -e "${GREEN}No known CVEs in Python dependencies.${RESET}"
    echo "$PIP_AUDIT" | tail -3
  fi

  echo ""
  header "npm CVE scan (npm audit)"

  NPM_AUDIT=$($COMPOSE exec -T frontend npm audit --audit-level=info 2>&1 || true)
  NPM_CRITICAL=$($COMPOSE exec -T frontend npm audit --audit-level=critical 2>&1; echo "EXIT:$?")

  if echo "$NPM_CRITICAL" | grep -q "EXIT:1"; then
    echo -e "${RED}Critical CVEs found in npm dependencies:${RESET}"
    echo "$NPM_AUDIT"
    CVE_FOUND=1
  else
    # Show summary even if no critical
    SUMMARY=$(echo "$NPM_AUDIT" | grep -E "found [0-9]+ vulnerabilit|severity|packages|npm audit" | tail -5)
    if [ -n "$SUMMARY" ]; then
      echo "$SUMMARY"
    else
      echo -e "${GREEN}No critical CVEs in npm dependencies.${RESET}"
    fi
    # Warn about non-critical
    if echo "$NPM_AUDIT" | grep -qiE "high|moderate"; then
      echo -e "${YELLOW}Non-critical vulnerabilities present — review with: make security-frontend${RESET}"
    fi
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

echo ""
sep
echo -e "${BOLD}Summary${RESET}"
sep

print_status() {
  local label="$1" code="$2"
  if [ "$code" -eq 0 ]; then
    echo -e "  ${GREEN}OK${RESET}  $label"
  else
    echo -e "  ${RED}!!${RESET}  $label"
  fi
}

$RUN_PYTHON && print_status "Python packages up to date"  $PYTHON_OUTDATED
$RUN_NPM    && print_status "npm packages up to date"     $NPM_OUTDATED
print_status "No CVEs found"                              $CVE_FOUND

echo ""

TOTAL=$((PYTHON_OUTDATED + NPM_OUTDATED + CVE_FOUND))
if [ "$TOTAL" -gt 0 ]; then
  echo -e "${YELLOW}Action required: review items above.${RESET}"
  echo -e "For CVE details: ${CYAN}make security${RESET}"
  echo -e "For outdated Python: ${CYAN}docker compose -f docker-compose.dev.yml exec backend pip list --outdated${RESET}"
  echo -e "For outdated npm: ${CYAN}docker compose -f docker-compose.dev.yml exec frontend npm outdated${RESET}"
  exit 1
else
  echo -e "${GREEN}All checks passed.${RESET}"
  exit 0
fi
