#!/usr/bin/env python3
"""
Rackscope — Example Non-Regression Test Suite
=============================================
Validates all 4 bundled examples against expected values.
Can be replayed at any time for regression testing.

Usage:
    python3 scripts/validate_examples.py [homelab|small-cluster|hpc-cluster|exascale|all]
    python3 scripts/validate_examples.py all            # full suite
    python3 scripts/validate_examples.py hpc-cluster   # single example

Output:
    - Console: colored pass/fail per assertion
    - config/examples/TEST_RESULTS.md: machine-readable results table
"""
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
COMPOSE_FILE = str(ROOT / 'docker-compose.dev.yml')
RESULTS_FILE = ROOT / 'config/examples/TEST_RESULTS.md'

# ── ANSI colors ───────────────────────────────────────────────────────────────
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
BOLD = '\033[1m'
RESET = '\033[0m'

def log(msg):
    print(f'{BLUE}{BOLD}[TEST]{RESET} {msg}')


def ok(msg):
    print(f'  {GREEN}✅  {msg}{RESET}')


def fail(msg):
    print(f'  {RED}❌  {msg}{RESET}')


def warn(msg):
    print(f'  {YELLOW}⚠️   {msg}{RESET}')


def info(msg):
    print(f'  {BLUE}ℹ️   {msg}{RESET}')

# ── Subprocess helpers ────────────────────────────────────────────────────────
def compose(*args):
    return subprocess.run(
        ['docker', 'compose', '-f', COMPOSE_FILE] + list(args),
        capture_output=True, text=True
    )

def api(path):
    r = compose('exec', '-T', 'backend', 'curl', '-s', f'http://localhost:8000{path}')
    try:
        return json.loads(r.stdout)
    except Exception:
        return {}

def prom(query):
    r = subprocess.run(
        ['curl', '-sg', 'http://localhost:9090/api/v1/query',
         '--data-urlencode', f'query={query}'],
        capture_output=True, text=True
    )
    try:
        return json.loads(r.stdout)['data']['result']
    except Exception:
        return []

def prom_count(query):
    r = prom(f'count({query})')
    return int(float(r[0]['value'][1])) if r else 0

def sim_count():
    r = subprocess.run(['curl', '-s', 'http://localhost:9000/metrics'],
                       capture_output=True, text=True)
    return r.stdout.count('\nup{')

def wait_sim(min_nodes, timeout=240):
    for _ in range(timeout // 3):
        if sim_count() >= min_nodes:
            return True
        time.sleep(3)
    return False

def get_rack_states():
    rooms = api('/api/rooms')
    counts = {'OK': 0, 'CRIT': 0, 'WARN': 0, 'UNKNOWN': 0, 'total': 0}
    unknown_racks = []
    for room in (rooms if isinstance(rooms, list) else []):
        room_id = room.get('id', '')
        if not room_id:
            continue
        state = api(f'/api/rooms/{room_id}/state')
        rack_data = state.get('racks', {}) if isinstance(state, dict) else {}
        for rid, info in rack_data.items():
            s = info.get('state', 'UNKNOWN') if isinstance(info, dict) else 'UNKNOWN'
            counts[s] = counts.get(s, 0) + 1
            counts['total'] += 1
            if s == 'UNKNOWN':
                unknown_racks.append(f'{room_id}/{rid}')
    if unknown_racks:
        warn(f'UNKNOWN racks: {unknown_racks[:5]}')
    return counts

# ── Lint ──────────────────────────────────────────────────────────────────────
def run_lint():
    log('Running linters...')
    passed = True
    tests = [
        (['exec', '-T', 'backend', 'ruff', 'check', '.', '--quiet'], 'ruff check'),
        (['exec', '-T', 'backend', 'ruff', 'format', '--check', '.', '--quiet'], 'ruff format'),
        (['exec', '-T', 'frontend', 'npm', 'run', 'lint', '--silent'], 'eslint'),
        (['exec', '-T', 'frontend', 'npm', 'run', 'lint:format', '--silent'], 'prettier'),
    ]
    for args, name in tests:
        r = compose(*args)
        if r.returncode == 0:
            ok(name)
        else:
            fail(f'{name}: {r.stderr[:200]}')
            passed = False
    return passed

# ── Switch example ────────────────────────────────────────────────────────────
def switch_example(ex):
    # Each example now has its own app.yaml inside config/examples/{ex}/
    app_yaml = ROOT / f'config/examples/{ex}/app.yaml'
    if not app_yaml.exists():
        raise FileNotFoundError(f'config/examples/{ex}/app.yaml not found')
    env_path = ROOT / '.env'
    env_path.write_text(f'APP_CONFIG=examples/{ex}/app.yaml\n')
    compose('up', '-d', '--force-recreate', '--no-deps', 'backend', 'simulator')

# ── Expected values per example ───────────────────────────────────────────────
EXPECTED = {
    'homelab': {
        'min_sim_nodes': 20, 'max_sim_nodes': 40,
        'rooms': 1, 'min_racks': 3,
        'min_up_nodes': 20, 'min_temp_nodes': 20, 'min_power_nodes': 20,
        'max_unknown_racks': 0,
        'slurm': False,
    },
    'small-cluster': {
        'min_sim_nodes': 500, 'max_sim_nodes': 700,
        'rooms': 1, 'min_racks': 10,
        'min_up_nodes': 500, 'min_temp_nodes': 500, 'min_power_nodes': 500,
        'max_unknown_racks': 0,
        'slurm': True,
    },
    'hpc-cluster': {
        'min_sim_nodes': 1800, 'max_sim_nodes': 2200,
        'rooms': 2, 'min_racks': 25,
        'min_up_nodes': 1800, 'min_temp_nodes': 1800, 'min_power_nodes': 1800,
        'max_unknown_racks': 0,
        'slurm': True,
    },
    'exascale': {
        'min_sim_nodes': 13000, 'max_sim_nodes': 16000,
        'rooms': 9, 'min_racks': 100,  # stats/total_racks counts unique-id rooms only
        'min_up_nodes': 13000, 'min_temp_nodes': 13000, 'min_power_nodes': 13000,
        'max_unknown_racks': 0,
        'slurm': True,
    },
}

# ── Assertions ────────────────────────────────────────────────────────────────
def assert_range(name, value, min_val, max_val=None):
    if max_val is None:
        if value >= min_val:
            ok(f'{name}: {value} >= {min_val}')
            return True
        else:
            fail(f'{name}: {value} < {min_val} (expected >= {min_val})')
            return False
    else:
        if min_val <= value <= max_val:
            ok(f'{name}: {value} in [{min_val}, {max_val}]')
            return True
        else:
            fail(f'{name}: {value} not in [{min_val}, {max_val}]')
            return False

def assert_eq(name, value, expected):
    if value == expected:
        ok(f'{name}: {value}')
        return True
    else:
        fail(f'{name}: got {value}, expected {expected}')
        return False

def assert_lte(name, value, max_val):
    if value <= max_val:
        ok(f'{name}: {value} <= {max_val}')
        return True
    else:
        fail(f'{name}: {value} > {max_val}')
        return False

# ── Validate one loop ─────────────────────────────────────────────────────────
def validate_loop(ex, loop_num, incident_mode=None):
    exp = EXPECTED[ex]
    results = {'example': ex, 'loop': loop_num, 'ts': datetime.now().strftime('%Y-%m-%d %H:%M'),
               'passed': 0, 'failed': 0, 'incident_mode': incident_mode or 'default'}

    log(f'[{ex}] Loop {loop_num} — mode={results["incident_mode"]}')

    # 1. Backend stats
    stats = api('/api/stats/global')
    rooms_list = api('/api/rooms')
    rooms = len(rooms_list) if isinstance(rooms_list, list) else stats.get('total_rooms', 0)
    racks = stats.get('total_racks', 0)

    p = assert_eq('rooms', rooms, exp['rooms'])
    results['passed' if p else 'failed'] += 1
    p = assert_range('racks', racks, exp['min_racks'])
    results['passed' if p else 'failed'] += 1
    results['rooms'] = rooms
    results['racks'] = racks

    # 2. Simulator metrics
    nodes_up  = prom_count('up{job="node"}')
    nodes_temp  = prom_count('node_temperature_celsius')
    nodes_power = prom_count('node_power_watts')
    pdu_racks   = prom_count('raritan_pdu_activepower_watt{inletid="I1"}')

    p = assert_range('sim up nodes',   nodes_up,    exp['min_up_nodes'],    exp['max_sim_nodes'])
    results['passed' if p else 'failed'] += 1
    p = assert_range('temperature nodes', nodes_temp, exp['min_temp_nodes'])
    results['passed' if p else 'failed'] += 1
    p = assert_range('power nodes',    nodes_power, exp['min_power_nodes'])
    results['passed' if p else 'failed'] += 1
    p = assert_range('PDU racks',      pdu_racks,   1)
    results['passed' if p else 'failed'] += 1

    results.update({'up_nodes': nodes_up, 'temp': nodes_temp, 'power': nodes_power, 'pdu': pdu_racks})

    # 3. Rack states
    rack_states = get_rack_states()
    unk = rack_states.get('UNKNOWN', 0)
    # Higher tolerance during incident injection (planner mid-snapshot transition)
    tolerance_unk = max(exp['max_unknown_racks'], 6 if incident_mode else 2)
    p = assert_lte('UNKNOWN racks', unk, tolerance_unk)
    results['passed' if p else 'failed'] += 1
    results.update({'rack_ok': rack_states.get('OK',0), 'rack_crit': rack_states.get('CRIT',0),
                    'rack_unk': unk})

    # 4. Slurm
    if exp['slurm']:
        slurm = api('/api/slurm/summary')
        slurm_ok = isinstance(slurm, dict) and 'detail' not in str(slurm)
        p = slurm_ok
        ok('Slurm API responding') if slurm_ok else fail('Slurm API not available')
        results['passed' if p else 'failed'] += 1
        results['slurm'] = 'OK' if slurm_ok else 'FAIL'
    else:
        slurm = api('/api/slurm/summary')
        slurm_disabled = isinstance(slurm, dict) and 'detail' in str(slurm)
        p = slurm_disabled
        ok('Slurm correctly disabled') if slurm_disabled else warn('Slurm unexpectedly enabled')
        results['passed' if p else 'failed'] += 1
        results['slurm'] = 'disabled'

    # 5. Incident test (loop 2 only)
    inc_result = 'N/A'
    if incident_mode == 'custom_10_10_1' and ex != 'homelab':
        time.sleep(5)  # let planner process new incidents
        down   = prom_count('up{job="node"} == 0')
        alerts = api('/api/alerts/active')
        crit_alerts = sum(1 for a in (alerts.get('alerts',[]) if isinstance(alerts,dict) else []) if a.get('state')=='CRIT')

        # Expect ~10 down nodes (tolerance ±3 for batch processing delays)
        # devices_crit=10 + racks_crit=1 (whole rack) -> total >> 10
        p = down >= 8
        ok(f'Incident CRIT nodes: {down} (devices_crit=10 + racks_crit=1 rack)') if p else fail(f'Incident CRIT nodes: {down} (expected >=8)')
        results['passed' if p else 'failed'] += 1

        # Expect CRIT alerts in API
        p = crit_alerts >= 1
        ok(f'CRIT alerts in API: {crit_alerts}') if p else fail(f'CRIT alerts: {crit_alerts} (expected ≥1)')
        results['passed' if p else 'failed'] += 1

        # Expect at least 1 rack CRIT due to racks_crit=1
        p = rack_states.get('CRIT', 0) >= 1
        if p:
            ok(f'Rack CRIT from racks_crit=1: {rack_states.get("CRIT", 0)}')
        else:
            fail('No rack CRIT found')
        results['passed' if p else 'failed'] += 1

        inc_result = f'down={down} crit_alerts={crit_alerts} rack_crit={rack_states.get("CRIT",0)}'

    results['incident'] = inc_result
    total = results['passed'] + results['failed']
    status = '✅' if results['failed'] == 0 else '❌'
    info(f'Loop {loop_num}: {results["passed"]}/{total} passed {status}')
    return results

# ── Set custom incidents ──────────────────────────────────────────────────────
def set_incidents(ex, mode, crit=0, warn_c=0, racks_c=0, cph=4):
    # Update the MAIN plugin.yaml (read by the simulator via SIMULATOR_CONFIG env var)
    # NOT the example-specific one — the simulator always reads the main path
    p = ROOT / 'config/plugins/simulator/config/plugin.yaml'
    if p.exists():
        d = yaml.safe_load(p.read_text())
    else:
        d = {}
    d['incident_mode'] = mode
    d['changes_per_hour'] = cph
    d['custom_incidents'] = {'devices_crit': crit, 'devices_warn': warn_c,
                             'racks_crit': racks_c, 'aisles_hot': 0}
    p.write_text(yaml.dump(d, default_flow_style=False, allow_unicode=True, sort_keys=False))

def restore_incidents(ex):
    DEFAULTS = {'homelab': 'light', 'small-cluster': 'medium',
                'hpc-cluster': 'medium', 'exascale': 'heavy'}
    set_incidents(ex, DEFAULTS.get(ex, 'light'), cph=4)
    # Also restore example-specific plugin.yaml
    ep = ROOT / f'config/examples/{ex}/plugins/simulator/config/plugin.yaml'
    if ep.exists():
        d = yaml.safe_load(ep.read_text())
        d['incident_mode'] = DEFAULTS.get(ex, 'light')
        d['changes_per_hour'] = 4
        d['custom_incidents'] = {'devices_crit': 0, 'devices_warn': 0, 'racks_crit': 0, 'aisles_hot': 0}
        ep.write_text(yaml.dump(d, default_flow_style=False, allow_unicode=True, sort_keys=False))

# ── Run full suite ────────────────────────────────────────────────────────────
def run_suite(examples):
    all_results = []
    ts_start = datetime.now().strftime('%Y-%m-%d %H:%M')

    # Lint first
    log('=== LINT CHECK ===')
    lint_ok = run_lint()
    if not lint_ok:
        fail('Lint failed — aborting test suite')
        sys.exit(1)
    ok('All linters passed')

    MIN_NODES = {'homelab': 20, 'small-cluster': 500, 'hpc-cluster': 1800, 'exascale': 13000}

    for ex in examples:
        log(f'\n{"="*60}')
        log(f'EXAMPLE: {ex.upper()}')
        log(f'{"="*60}')

        # Switch + restart
        log(f'[{ex}] Switching config and restarting...')
        switch_example(ex)

        # Wait for simulator
        min_n = MIN_NODES.get(ex, 10)
        log(f'[{ex}] Waiting for simulator ({min_n}+ nodes)...')
        if wait_sim(min_n):
            ok(f'Simulator ready ({sim_count()} nodes)')
        else:
            warn('Simulator slow — continuing with available data')
            # For large topologies (exascale), first tick can take 2-3min.
            # Add extra wait so Prometheus has time to scrape before Loop 1.
            if min_n >= 10000:
                log(f'[{ex}] Large topology — waiting extra 60s for first Prometheus scrape...')
                time.sleep(60)
        time.sleep(120)  # 2x planner cache TTL ensures fresh snapshot after sim ready

        # Loop 1: normal mode
        r1 = validate_loop(ex, 1)
        all_results.append(r1)

        # Loop 2: custom incidents (10 CRIT + 10 WARN + 1 rack CRIT)
        if ex != 'homelab':
            log(f'[{ex}] Setting custom incidents: 10 CRIT + 10 WARN + 1 rack CRIT...')
            set_incidents(ex, 'custom', crit=10, warn_c=10, racks_c=1, cph=99)
            compose('up', '-d', '--force-recreate', 'simulator')
            time.sleep(20)  # simulator restart
            time.sleep(65)  # Prometheus scrape (15s) + planner cache (60s)
            r2 = validate_loop(ex, 2, incident_mode='custom_10_10_1')
        else:
            r2 = validate_loop(ex, 2)
        all_results.append(r2)

        # Restore
        restore_incidents(ex)

    # Write results
    write_results(all_results, ts_start, lint_ok)

    # Summary
    total_p = sum(r['passed'] for r in all_results)
    total_f = sum(r['failed'] for r in all_results)
    log(f'\n{"="*60}')
    log(f'SUITE COMPLETE: {total_p} passed, {total_f} failed')
    if total_f == 0:
        ok('ALL TESTS PASSED ✅')
    else:
        fail(f'{total_f} tests failed ❌')
    log(f'Results: {RESULTS_FILE}')
    return total_f == 0

def write_results(results, ts_start, lint_ok):
    lines = [
        '# Rackscope Example Test Results',
        '',
        f'> Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
        f'> Suite started: {ts_start}',
        '',
        f'## Lint: {"✅ passed" if lint_ok else "❌ FAILED"}',
        '',
        '## Validation Results',
        '',
        '| Example | Loop | Mode | Rooms | Racks | Up nodes | Temp | Power | PDU | OK | CRIT | UNKNOWN | Slurm | Incident | Pass/Fail |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ]
    for r in results:
        p = r['passed']
        f = r['failed']
        status = '✅' if f == 0 else f'❌ ({f} fail)'
        lines.append(
            f'| {r["example"]} | {r["loop"]} | {r.get("incident_mode","default")} '
            f'| {r.get("rooms","?")} | {r.get("racks","?")} '
            f'| {r.get("up_nodes","?")} | {r.get("temp","?")} | {r.get("power","?")} '
            f'| {r.get("pdu","?")} | {r.get("rack_ok","?")} | {r.get("rack_crit","?")} '
            f'| {r.get("rack_unk","?")} | {r.get("slurm","?")} '
            f'| {r.get("incident","N/A")} | {status} ({p}/{p+f}) |'
        )
    lines += [
        '',
        '## Column definitions',
        '- **Loop 1**: normal incident mode',
        '- **Loop 2**: custom mode (10 CRIT + 10 WARN + 1 rack CRIT for non-homelab)',
        '- **Up nodes**: count(`up{job="node"}`) in Prometheus',
        '- **Temp/Power**: count(`node_temperature_celsius` / `node_power_watts`)',
        '- **PDU**: racks with `raritan_pdu_activepower_watt{inletid="I1"}`',
        '- **Incident**: down nodes + CRIT alerts + rack CRIT from custom mode',
        '',
        '## How to replay',
        '```bash',
        'python3 scripts/validate_examples.py all',
        'python3 scripts/validate_examples.py hpc-cluster  # single example',
        '```',
    ]
    RESULTS_FILE.write_text('\n'.join(lines) + '\n')

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    ALL = ['homelab', 'small-cluster', 'hpc-cluster', 'exascale']
    examples = ALL if target == 'all' else [target]
    ok_exit = run_suite(examples)
    sys.exit(0 if ok_exit else 1)
