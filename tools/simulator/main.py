import time
import random
import yaml
import os
import math
import re
from prometheus_client import start_http_server, Gauge

# Configuration Paths
TOPOLOGY_PATH = os.getenv("TOPOLOGY_FILE", "/app/config/topology")
SIMULATOR_CONFIG_PATH = os.getenv("SIMULATOR_CONFIG", "/app/config/simulator.yaml")

# Metrics definition
NODE_TEMP = Gauge('node_temperature_celsius', 'Ambient temperature of the node', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])
NODE_POWER = Gauge('node_power_watts', 'Power consumption of the node', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])
NODE_HEALTH = Gauge('node_health_status', 'Health status (0=OK, 1=WARN, 2=CRIT)', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])
NODE_LOAD = Gauge('node_load_percent', 'Resource load (CPU/GPU/Switch)', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])

def load_yaml(path):
    try:
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return {}

def load_topology_data(path):
    if os.path.isdir(path):
        sites_path = os.path.join(path, "sites.yaml")
        sites_data = load_yaml(sites_path) or {}
        sites_out = []
        for site in sites_data.get("sites", []):
            site_id = site.get("id")
            if not site_id:
                continue
            rooms_out = []
            room_entries = site.get("rooms") or []
            if not room_entries:
                rooms_dir = os.path.join(path, "datacenters", site_id, "rooms")
                room_entries = [{"id": p} for p in sorted(os.listdir(rooms_dir)) if os.path.isdir(os.path.join(rooms_dir, p))]
            for room_entry in room_entries:
                room_id = room_entry.get("id") if isinstance(room_entry, dict) else room_entry
                room_path = os.path.join(path, "datacenters", site_id, "rooms", room_id, "room.yaml")
                room_data = load_yaml(room_path) or {}
                aisles_out = []
                for aisle in room_data.get("aisles", []):
                    aisle_id = aisle.get("id") if isinstance(aisle, dict) else aisle
                    aisle_path = os.path.join(path, "datacenters", site_id, "rooms", room_id, "aisles", aisle_id, "aisle.yaml")
                    aisle_data = load_yaml(aisle_path) or {}
                    racks_out = []
                    for rack_ref in aisle_data.get("racks", []):
                        rack_id = rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                        rack_path = os.path.join(path, "datacenters", site_id, "rooms", room_id, "aisles", aisle_id, "racks", f"{rack_id}.yaml")
                        rack_data = load_yaml(rack_path) or {}
                        racks_out.append(rack_data)
                    aisles_out.append({"id": aisle_id, "name": aisle.get("name"), "racks": racks_out})
                standalone_out = []
                for rack_ref in room_data.get("standalone_racks", []):
                    rack_id = rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                    rack_path = os.path.join(path, "datacenters", site_id, "rooms", room_id, "standalone_racks", f"{rack_id}.yaml")
                    rack_data = load_yaml(rack_path) or {}
                    standalone_out.append(rack_data)
                rooms_out.append({
                    "id": room_data.get("id", room_id),
                    "name": room_data.get("name", room_id),
                    "aisles": aisles_out,
                    "standalone_racks": standalone_out,
                })
            sites_out.append({"id": site_id, "name": site.get("name", site_id), "rooms": rooms_out})
        return {"sites": sites_out}
    return load_yaml(path)

def parse_nodeset(pattern):
    if not isinstance(pattern, str): return pattern or {}
    match = re.match(r"(.+)\[(\d+)-(\d+)\]", pattern)
    if not match: return {1: pattern}
    prefix, start_str, end_str = match.groups()
    start, end = int(start_str), int(end_str)
    count = end - start + 1
    padding = len(start_str)
    nodes = {}
    for i in range(count):
        num = str(start + i).zfill(padding)
        nodes[i+1] = f"{prefix}{num}"
    return nodes

def load_topology_nodes(topo_data):
    targets = []
    if not topo_data: return []
    for site in topo_data.get('sites', []):
        for room in site.get('rooms', []):
            def process_rack(rack, aisle_id):
                for device in rack.get('devices', []):
                    nodes_map = device.get('nodes')
                    if isinstance(nodes_map, str): nodes_map = parse_nodeset(nodes_map)
                    if not nodes_map:
                        targets.append({'site_id': site['id'], 'room_id': room['id'], 'aisle_id': aisle_id, 'rack_id': rack['id'], 'chassis_id': device['id'], 'node_id': device['id']})
                    else:
                        for _, node_id in nodes_map.items():
                            targets.append({'site_id': site['id'], 'room_id': room['id'], 'aisle_id': aisle_id, 'rack_id': rack['id'], 'chassis_id': device['id'], 'node_id': node_id})
            for aisle in room.get('aisles', []):
                for rack in aisle.get('racks', []): process_rack(rack, aisle['id'])
            for rack in room.get('standalone_racks', []): process_rack(rack, 'standalone')
    return targets

active_incidents = {'aisles': {}, 'racks': {}}

def simulate():
    # Load Initial Config
    sim_cfg = load_yaml(SIMULATOR_CONFIG_PATH)
    update_interval = sim_cfg.get('update_interval', 20)
    rates = sim_cfg.get('incident_rates', {})
    durations = sim_cfg.get('incident_durations', {'rack': 3, 'aisle': 5})
    profiles = sim_cfg.get('profiles', {})

    print(f"Starting simulation loop (Interval: {update_interval}s)")
    tick = 0
    
    while True:
        # Reload topology every tick to support dynamic changes
        topo_data = load_topology_data(TOPOLOGY_PATH)
        targets = load_topology_nodes(topo_data)
        tick += 1
        
        # --- Macro Incidents ---
        for aisle in set(t['aisle_id'] for t in targets):
            if aisle not in active_incidents['aisles'] and random.random() < rates.get('aisle_cooling_failure', 0.005):
                print(f"!!! Incident: Aisle {aisle} cooling failure")
                active_incidents['aisles'][aisle] = tick
            elif aisle in active_incidents['aisles'] and (tick - active_incidents['aisles'][aisle]) > durations.get('aisle', 5):
                del active_incidents['aisles'][aisle]

        for rack in set(t['rack_id'] for t in targets):
            if rack not in active_incidents['racks'] and random.random() < rates.get('rack_macro_failure', 0.01):
                print(f"!!! Incident: Rack {rack} power issue")
                active_incidents['racks'][rack] = tick
            elif rack in active_incidents['racks'] and (tick - active_incidents['racks'][rack]) > durations.get('rack', 3):
                del active_incidents['racks'][rack]

        for target in targets:
            labels = {k: v for k, v in target.items() if k != 'aisle_id'}
            nid = target['node_id'].lower()
            aid = target['aisle_id']
            rid = target['rack_id']
            
            random.seed(nid + str(tick // 2))
            
            # --- Determine Profile ---
            prof_name = 'compute' if nid.startswith('compute') else \
                        'gpu' if nid.startswith('gpu') else \
                        'service' if (nid.startswith('login') or nid.startswith('mngt')) else \
                        'network' if ('isw' in nid or 'esw' in nid) else 'compute' 
            
            p = profiles.get(prof_name, profiles.get('compute', {}))
            
            # Base calculation
            load_min = p.get('load_min', 10)
            load_max = p.get('load_max', 50)
            
            if prof_name == 'compute':
                load = load_min + ((math.sin(tick / 10.0) + 1) / 2.0 * (load_max - load_min))
            elif prof_name == 'gpu':
                load = random.uniform(load_min, load_max) if random.random() > 0.7 else random.uniform(5, 15)
            else:
                load = random.uniform(load_min, load_max)

            # --- Apply Macro Incidents ---
            temp_boost = 12.0 if aid in active_incidents['aisles'] else 0
            is_down = rid in active_incidents['racks']

            # Final Metrics
            temp = p.get('base_temp', 22) + (load / 100.0 * p.get('temp_range', 5)) + temp_boost + random.uniform(-0.5, 0.5)
            power = (p.get('base_power', 150) + (load / 100.0 * p.get('power_var', 50))) if not is_down else 50.0
            final_load = load if not is_down else 0

            # Micro-failures
            if not is_down and random.random() < rates.get('node_micro_failure', 0.001):
                temp += 25.0

            NODE_TEMP.labels(**labels).set(round(temp, 1))
            NODE_POWER.labels(**labels).set(round(power, 0))
            NODE_LOAD.labels(**labels).set(round(final_load, 1))
            
            status = 0
            if is_down or temp > 45: status = 2
            elif temp > 38: status = 1
            NODE_HEALTH.labels(**labels).set(status)

        time.sleep(update_interval)

if __name__ == '__main__':
    start_http_server(9000)
    simulate()
