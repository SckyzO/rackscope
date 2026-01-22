import time
import random
import yaml
import os
import math
import re
from prometheus_client import start_http_server, Gauge

# Configuration
CONFIG_PATH = os.getenv("TOPOLOGY_FILE", "/app/config/topology.yaml")
UPDATE_INTERVAL = 5

# Metrics definition
# We now focus on Node metrics primarily
NODE_TEMP = Gauge('node_temperature_celsius', 'Ambient temperature of the node', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])
NODE_POWER = Gauge('node_power_watts', 'Power consumption of the node', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])
NODE_HEALTH = Gauge('node_health_status', 'Health status (0=OK, 1=WARN, 2=CRIT)', ['site_id', 'room_id', 'rack_id', 'chassis_id', 'node_id'])

# Helper to parse "compute[001-004]"
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

def load_topology_nodes():
    """Extract all node IDs from the topology file."""
    targets = []
    try:
        with open(CONFIG_PATH, 'r') as f:
            data = yaml.safe_load(f)
            if not data: return []
            
            for site in data.get('sites', []):
                for room in site.get('rooms', []):
                    # Helper to process a rack
                    def process_rack(rack):
                        for device in rack.get('devices', []):
                            nodes_map = device.get('nodes')
                            if isinstance(nodes_map, str):
                                nodes_map = parse_nodeset(nodes_map)
                            
                            # If no nodes defined (e.g. switch without logical nodes), treat device as one node
                            if not nodes_map:
                                targets.append({
                                    'site_id': site['id'], 'room_id': room['id'], 
                                    'rack_id': rack['id'], 'chassis_id': device['id'],
                                    'node_id': device['id'] # Self-reference
                                })
                            else:
                                for _, node_id in nodes_map.items():
                                    targets.append({
                                        'site_id': site['id'], 'room_id': room['id'], 
                                        'rack_id': rack['id'], 'chassis_id': device['id'],
                                        'node_id': node_id
                                    })

                    for aisle in room.get('aisles', []):
                        for rack in aisle.get('racks', []):
                            process_rack(rack)
                    for rack in room.get('standalone_racks', []):
                        process_rack(rack)
    except Exception as e:
        print(f"Error loading topology: {e}")
    return targets

def simulate():
    """Update metrics with simulated values."""
    print("Starting simulation loop...")
    tick = 0
    
    while True:
        targets = load_topology_nodes() # Reload occasionally to support config changes? For now ok.
        tick += 1
        
        for target in targets:
            labels = {k: v for k, v in target.items()}
            node_id = target['node_id']
            
            random.seed(node_id + str(tick))
            
            # Temp simulation
            base_temp = 22 + (math.sin(tick / 20.0) * 2) 
            noise = random.uniform(-1.0, 1.5)
            temp = base_temp + noise
            
            # Random "Bad Day" for some nodes
            if "003" in node_id or (random.random() > 0.97):
                temp += 15 # Overheat!
            
            NODE_TEMP.labels(**labels).set(round(temp, 1))
            
            # Power simulation
            power = 250 + random.uniform(-50, 150) # Per node power
            if "switch" in node_id: power = 100
            
            NODE_POWER.labels(**labels).set(round(power, 0))
            
            # Health Status
            status = 0
            if temp > 35: status = 2
            elif temp > 30: status = 1
            
            NODE_HEALTH.labels(**labels).set(status)

        time.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    print("Starting Prometheus Exporter on port 9000")
    start_http_server(9000)
    simulate()
