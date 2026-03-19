#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Rackscope — Example Validation Test Suite
# 
# For each example:
#   1. Lint (ruff + eslint)
#   2. Switch config
#   3. Rebuild simulator (picks up topology)
#   4. Run 2 validation loops
#   5. Write results to config/examples/TEST_RESULTS.md
#
# Usage:
#   ./scripts/run-example-tests.sh [homelab|small-cluster|hpc-cluster|exascale|all]
#   ./scripts/run-example-tests.sh all    ← run everything
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RESULTS_FILE="$ROOT/config/examples/TEST_RESULTS.md"
COMPOSE="docker compose -f $ROOT/docker-compose.dev.yml"
TS=$(date '+%Y-%m-%d %H:%M')

TARGET="${1:-all}"
EXAMPLES=()
if [[ "$TARGET" == "all" ]]; then
    EXAMPLES=(homelab small-cluster hpc-cluster exascale)
else
    EXAMPLES=("$TARGET")
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

log() { echo -e "\033[1;34m[TEST]\033[0m $*"; }
ok()  { echo -e "\033[1;32m  ✅  $*\033[0m"; }
err() { echo -e "\033[1;31m  ❌  $*\033[0m"; }
warn(){ echo -e "\033[1;33m  ⚠️   $*\033[0m"; }

api() {
    $COMPOSE exec -T backend curl -s "http://localhost:8000$1" 2>/dev/null
}

prom_count() {
    local q="$1"
    curl -sg "http://localhost:9090/api/v1/query" --data-urlencode "query=count($q)" 2>/dev/null \
      | python3 -c "import json,sys; r=json.load(sys.stdin)['data']['result']; print(int(float(r[0]['value'][1])) if r else 0)" 2>/dev/null || echo 0
}

wait_sim_ready() {
    local expected="$1"
    local max=60
    local count=0
    while [[ $count -lt $max ]]; do
        local actual
        actual=$(curl -s "http://localhost:9000/metrics" 2>/dev/null | grep -c "^up{" || echo 0)
        if [[ "$actual" -ge "$expected" ]]; then
            return 0
        fi
        sleep 2; count=$((count+2))
    done
    return 1
}

# ── Lint ──────────────────────────────────────────────────────────────────────

run_lint() {
    log "Running linters..."
    if $COMPOSE exec -T backend ruff check . --quiet; then ok "ruff check"; else err "ruff check FAILED"; return 1; fi
    if $COMPOSE exec -T backend ruff format --check . --quiet; then ok "ruff format"; else err "ruff format FAILED"; return 1; fi
    if $COMPOSE exec -T frontend npm run lint --silent 2>/dev/null; then ok "eslint"; else err "eslint FAILED"; return 1; fi
    if $COMPOSE exec -T frontend npm run lint:format --silent 2>/dev/null; then ok "prettier"; else err "prettier FAILED"; return 1; fi
}

# ── Validate one example ──────────────────────────────────────────────────────

validate_example() {
    local ex="$1"
    local loop="$2"    # 1 or 2
    local incident_test="$3"  # true/false

    log "[$ex] Loop $loop — incident_test=$incident_test"

    local stats
    stats=$(api "/api/stats/global")
    local rooms racks
    rooms=$(echo "$stats" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_rooms',0))" 2>/dev/null || echo 0)
    racks=$(echo "$stats" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_racks',0))" 2>/dev/null || echo 0)

    local up_nodes pdu_racks
    up_nodes=$(prom_count 'up{job="node"}')
    pdu_racks=$(prom_count 'raritan_pdu_activepower_watt{inletid="I1"}')

    # Rack state summary
    local rack_ok
    rack_ok=$(api "/api/rooms" | python3 -c "
import json,sys,subprocess
rooms = json.load(sys.stdin)
ok=crit=unk=0
for r in rooms:
    import subprocess as sp
    s = sp.run(['docker','compose','-f','$(pwd)/docker-compose.dev.yml','exec','-T','backend','curl','-s',f'http://localhost:8000/api/rooms/{r[\"id\"]}/state'], capture_output=True, text=True)
    try:
        d = json.loads(s.stdout)
        for rk in d.get('racks',{}).values():
            st=rk.get('state','?')
            if st=='OK': ok+=1
            elif st=='CRIT': crit+=1
            elif st=='UNKNOWN': unk+=1
    except: pass
print(ok,crit,unk)
" 2>/dev/null || echo "? ? ?")
    read -r ROK RCRIT RUNK <<< "$rack_ok"

    # Incident test validation
    local inc_result="N/A"
    if [[ "$incident_test" == "true" ]] && [[ "$ex" != "homelab" ]]; then
        local down_nodes warn_nodes
        down_nodes=$(prom_count 'up{job="node"} == 0')
        warn_nodes=$(api "/api/alerts/active" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(sum(1 for a in d.get('alerts',[]) if a.get('state')=='WARN'))
" 2>/dev/null || echo 0)
        inc_result="down=${down_nodes}/10 warn_alerts=${warn_nodes}"
        if [[ "$down_nodes" -ge 8 ]]; then ok "  Incident: down=$down_nodes/10 ≈ expected"; else warn "  Incident: down=$down_nodes/10 (expected ~10)"; fi
    fi

    # Slurm check
    local slurm_status="disabled"
    if [[ "$ex" != "homelab" ]]; then
        local slurm_resp
        slurm_resp=$(api "/api/slurm/summary" | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if 'detail' not in str(d) else 'FAIL')" 2>/dev/null || echo FAIL)
        slurm_status="$slurm_resp"
    fi

    # UNKNOWN rack check
    if [[ "$RUNK" -gt 0 ]]; then
        warn "  UNKNOWN racks: $RUNK — need investigation"
    else
        ok "  No UNKNOWN racks"
    fi

    echo "| $ex | $loop | $TS | $rooms | $racks | $up_nodes | $ROK | $RCRIT | $RUNK | $pdu_racks | $slurm_status | $inc_result |"
}

# ── Main loop ──────────────────────────────────────────────────────────────────

{
    echo "# Rackscope Example Test Results"
    echo ""
    echo "> Generated: $TS"
    echo ""
} > "$RESULTS_FILE.tmp"

# Lint first
log "=== LINT CHECK ==="
if run_lint; then
    ok "All linters passed"
    echo "## Lint: ✅ passed ($TS)" >> "$RESULTS_FILE.tmp"
else
    err "Lint failed — aborting"
    echo "## Lint: ❌ FAILED ($TS)" >> "$RESULTS_FILE.tmp"
    exit 1
fi

{
    echo ""
    echo "## Validation Results"
    echo ""
    echo "| Example | Loop | Timestamp | Rooms | Racks | Sim nodes | OK | CRIT | UNKNOWN | PDU | Slurm | Incident test |"
    echo "|---|---|---|---|---|---|---|---|---|---|---|---|"
} >> "$RESULTS_FILE.tmp"

for ex in "${EXAMPLES[@]}"; do
    log "=== EXAMPLE: $ex ==="

    # Switch example
    cp "$ROOT/config/app.example.${ex}.yaml" "$ROOT/config/app.yaml"

    # Rebuild + restart
    log "[$ex] Rebuilding and restarting..."
    $COMPOSE restart backend simulator > /dev/null 2>&1

    # Wait for simulator
    local_min_nodes=10
    case "$ex" in
        homelab) local_min_nodes=20 ;;
        small-cluster) local_min_nodes=500 ;;
        hpc-cluster) local_min_nodes=1800 ;;
        exascale) local_min_nodes=13000 ;;
    esac

    log "[$ex] Waiting for simulator ($local_min_nodes+ nodes)..."
    if wait_sim_ready "$local_min_nodes"; then
        ok "Simulator ready"
    else
        warn "Simulator slow — continuing anyway"
    fi
    sleep 15  # let planner process

    # Loop 1: normal mode
    ROW=$(validate_example "$ex" "1" "false")
    echo "$ROW" >> "$RESULTS_FILE.tmp"
    ok "[$ex] Loop 1 done"

    # Set custom incident mode for loop 2: 10 CRIT + 10 WARN + 1 rack CRIT
    if [[ "$ex" != "homelab" ]]; then
        log "[$ex] Setting incident mode: custom 10/10/1..."
        # Update plugin.yaml for this example
        python3 -c "
import yaml, os
p = 'config/examples/$ex/plugins/simulator/config/plugin.yaml'
d = yaml.safe_load(open(p))
d['incident_mode'] = 'custom'
d['changes_per_hour'] = 99  # force immediate reshuffle
d['custom_incidents'] = {'devices_crit': 10, 'devices_warn': 10, 'racks_crit': 1, 'aisles_hot': 0}
open(p,'w').write(yaml.dump(d, default_flow_style=False, allow_unicode=True, sort_keys=False))
print('plugin.yaml updated')
"
        $COMPOSE up -d --force-recreate simulator > /dev/null 2>&1
        sleep 25  # wait for reshuffle + planner

        # Loop 2: incident test
        ROW=$(validate_example "$ex" "2" "true")
        echo "$ROW" >> "$RESULTS_FILE.tmp"
        ok "[$ex] Loop 2 (incident) done"

        # Restore original incident mode
        python3 -c "
import yaml
MODES={'small-cluster':'medium','hpc-cluster':'medium','exascale':'heavy'}
p = 'config/examples/$ex/plugins/simulator/config/plugin.yaml'
d = yaml.safe_load(open(p))
d['incident_mode'] = MODES.get('$ex','light')
d['changes_per_hour'] = 4
d['custom_incidents'] = {'devices_crit':0,'devices_warn':0,'racks_crit':0,'aisles_hot':0}
open(p,'w').write(yaml.dump(d, default_flow_style=False, allow_unicode=True, sort_keys=False))
"
    else
        # homelab loop 2: same but different incident
        ROW=$(validate_example "$ex" "2" "false")
        echo "$ROW" >> "$RESULTS_FILE.tmp"
        ok "[$ex] Loop 2 done"
    fi
done

# Finalize report
cat >> "$RESULTS_FILE.tmp" << 'EOF'

## Column definitions
- **Rooms**: total rooms in backend topology
- **Racks**: total racks in backend topology  
- **Sim nodes**: nodes generating `up` metrics in Prometheus
- **OK/CRIT/UNKNOWN**: rack health states across all rooms
- **PDU**: racks with `raritan_pdu_activepower_watt{inletid="I1"}` in Prometheus
- **Slurm**: API /api/slurm/summary response (OK = plugin enabled and responding)
- **Incident test**: loop 2 with custom 10 CRIT + 10 WARN + 1 rack CRIT

## Notes
- UNKNOWN racks = configuration issue (check device templates / missing metrics)
- Incident test validates TelemetryPlanner debounce + aggregation
- PDU count < rack count: service/network racks may not have PDU in simulator
EOF

mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
log "=== ALL TESTS COMPLETE ==="
log "Results: $RESULTS_FILE"
