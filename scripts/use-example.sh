#!/bin/bash
# Switch the active config to one of the bundled examples.
# Usage: ./scripts/use-example.sh [homelab|small-cluster|hpc-cluster|exascale|full-datacenter|simple-room]
#
# For config/examples/* — uses app.example.XXX.yaml + config/examples/XXX/
# For examples/*        — legacy approach (copies into config/)
#
# This script NEVER deletes config/ to avoid breaking Docker bind mounts.

set -euo pipefail

EXAMPLE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "$EXAMPLE" ]]; then
  echo "Usage: $0 <example>"
  echo ""
  echo "Built-in examples (config/examples/ — recommended):"
  for d in "$ROOT/config/examples"/*/; do
    name="$(basename "$d")"
    echo "  $name"
  done
  echo ""
  echo "Legacy examples (examples/ — copies into config/):"
  for d in "$ROOT/examples"/*/; do
    name="$(basename "$d")"
    [[ -f "$d/README.md" ]] && echo "  $name" || true
  done
  exit 1
fi

APP_YAML="$ROOT/config/app.example.${EXAMPLE}.yaml"

# ── New style: config/examples/XXX ───────────────────────────────────────────
if [[ -f "$APP_YAML" ]]; then
  echo "→ Activating example: $EXAMPLE (config/examples/$EXAMPLE/)"
  echo "→ Backing up current config/app.yaml to config/app.yaml.bak"
  cp "$ROOT/config/app.yaml" "$ROOT/config/app.yaml.bak" 2>/dev/null || true
  cp "$APP_YAML" "$ROOT/config/app.yaml"

  # Ensure simulator overrides dir exists
  mkdir -p "$ROOT/config/examples/$EXAMPLE/plugins/simulator/overrides"
  touch "$ROOT/config/examples/$EXAMPLE/plugins/simulator/overrides/overrides.yaml"

  # Copy simulator metrics catalog if not present in example
  if [[ ! -d "$ROOT/config/examples/$EXAMPLE/plugins/simulator/metrics" ]]; then
    mkdir -p "$ROOT/config/examples/$EXAMPLE/plugins/simulator/metrics"
    cp "$ROOT/config/plugins/simulator/metrics/"*.yaml \
       "$ROOT/config/examples/$EXAMPLE/plugins/simulator/metrics/" 2>/dev/null || true
  fi

  echo "→ Restarting backend and simulator..."
  docker compose -f "$ROOT/docker-compose.dev.yml" restart backend simulator 2>/dev/null || true

  echo ""
  echo "✓ Active example: $EXAMPLE"
  echo "  Open https://localhost — the UI will reflect the new topology."
  echo ""
  echo "  To restore previous config:"
  echo "    cp config/app.yaml.bak config/app.yaml && make restart"
  exit 0
fi

# ── Legacy style: examples/XXX ───────────────────────────────────────────────
LEGACY_DIR="$ROOT/examples/$EXAMPLE"
if [[ -d "$LEGACY_DIR" ]]; then
  echo "→ [Legacy] Activating example: $EXAMPLE (examples/$EXAMPLE/)"
  echo "→ Replacing contents of config/ (directory preserved for Docker bind mount)"
  echo "→ Backing up current config/ to config.bak/"
  rm -rf "$ROOT/config.bak"
  cp -r "$ROOT/config" "$ROOT/config.bak"

  rm -rf "$ROOT/config"/*
  cp -r "$LEGACY_DIR/." "$ROOT/config/"
  mkdir -p "$ROOT/config/plugins/simulator/overrides"
  touch "$ROOT/config/plugins/simulator/overrides/overrides.yaml"

  # Fix paths in app.yaml
  python3 -c "
content = open('$ROOT/config/app.yaml').read()
for old, new in [
  ('topology: topology',    'topology: config/topology'),
  ('templates: templates',  'templates: config/templates'),
  ('checks: checks/library','checks: config/checks/library'),
]:
    content = content.replace(old, new)
open('$ROOT/config/app.yaml', 'w').write(content)
"

  echo "→ Restarting backend and simulator..."
  docker compose -f "$ROOT/docker-compose.dev.yml" restart backend simulator 2>/dev/null || true

  echo ""
  echo "✓ Active example (legacy): $EXAMPLE"
  echo "  To restore: cp -r config.bak/* config/ && make restart"
  exit 0
fi

echo "Error: example '$EXAMPLE' not found."
echo "Run '$0' without arguments to list available examples."
exit 1
