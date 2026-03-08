#!/bin/bash
# Switch the active config to one of the bundled examples.
# Usage: ./scripts/use-example.sh [full-datacenter|simple-room|hpc-cluster]
#
# This script:
#   1. Backs up the current config/ to config.bak/
#   2. Copies the selected example into config/
#   3. Restarts the backend and simulator

set -euo pipefail

EXAMPLE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "$EXAMPLE" ]]; then
  echo "Usage: $0 <example>"
  echo ""
  echo "Available examples:"
  for d in "$ROOT/examples"/*/; do
    name="$(basename "$d")"
    desc=""
    [[ -f "$d/README.md" ]] && desc=" — $(head -2 "$d/README.md" | tail -1 | sed 's/^# //')"
    echo "  $name$desc"
  done
  exit 1
fi

EXAMPLE_DIR="$ROOT/examples/$EXAMPLE"
if [[ ! -d "$EXAMPLE_DIR" ]]; then
  echo "Error: example '$EXAMPLE' not found in examples/"
  exit 1
fi

echo "→ Backing up current config/ to config.bak/"
rm -rf "$ROOT/config.bak"
cp -r "$ROOT/config" "$ROOT/config.bak"

echo "→ Loading example: $EXAMPLE"
rm -rf "$ROOT/config"
cp -r "$EXAMPLE_DIR" "$ROOT/config"
# Restore simulator overrides dir (needed at runtime)
mkdir -p "$ROOT/config/plugins/simulator/overrides"
touch "$ROOT/config/plugins/simulator/overrides/overrides.yaml"

echo "→ Restarting backend and simulator..."
docker compose -f "$ROOT/docker-compose.dev.yml" restart backend simulator 2>/dev/null || true

echo ""
echo "✓ Active example: $EXAMPLE"
echo "  Open http://localhost:5173 — the UI will reflect the new topology."
echo ""
echo "  To restore your previous config:"
echo "    cp -r config.bak config && make restart"
