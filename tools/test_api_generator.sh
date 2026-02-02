#!/bin/bash
# Test script for API topology generator

set -e

echo "=== Testing API Topology Generator ==="
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
if curl -s http://localhost:8000/api/healthz > /dev/null 2>&1; then
    echo "   ✓ Backend is running"
else
    echo "   ✗ Backend is not running"
    echo "   Please start it with: make up"
    exit 1
fi

echo ""
echo "2. Testing dry-run mode (no actual changes)..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Run inside Docker container where all dependencies are available
cd "$PROJECT_ROOT"
docker compose exec -T backend python3 << 'EOF'
import sys
import os
# Add tools directory to Python path (relative to current working directory in container)
sys.path.insert(0, os.path.join(os.getcwd(), 'tools'))

from pathlib import Path
import yaml
from generator_models import GeneratorConfig

# Load small config - use relative path from project root
with open('tools/generator_config_small.yaml') as f:
    config_data = yaml.safe_load(f)

config = GeneratorConfig(**config_data)
print(f"✓ Configuration loaded: {config.description}")
print(f"  Sites: {len(config.sites)}")
print(f"  Rooms: {sum(len(s.rooms) for s in config.sites)}")
print(f"  Aisles: {sum(len(a.aisles) for r in s.rooms for a in r.aisles for s in config.sites)}")
EOF

echo ""
echo "3. API generator is ready to use!"
echo ""
echo "Usage examples:"
echo "  # Dry run (safe, shows what would be created)"
echo "  docker compose exec backend python tools/generate_topology_api.py -c tools/generator_config_small.yaml --dry-run"
echo ""
echo "  # Actually create topology (requires empty topology or will append)"
echo "  docker compose exec backend python tools/generate_topology_api.py -c tools/generator_config_small.yaml"
echo ""
