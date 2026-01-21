import time
import random
import yaml
import os
import math
from prometheus_client import start_http_server, Gauge

# Configuration
CONFIG_PATH = os.getenv("TOPOLOGY_FILE", "/app/config/topology.yaml")
UPDATE_INTERVAL = 5

# Metrics definition
RACK_TEMP = Gauge('rack_temperature_celsius', 'Ambient temperature of the rack', ['site_id', 'room_id', 'rack_id'])
RACK_POWER = Gauge('rack_power_watts', 'Power consumption of the rack', ['site_id', 'room_id', 'rack_id'])
RACK_HEALTH = Gauge('rack_health_status', 'Health status (0=OK, 1=WARN, 2=CRIT)', ['site_id', 'room_id', 'rack_id'])

def load_racks():
    """Extract all rack IDs from the topology file."""
    racks = []
    try:
        with open(CONFIG_PATH, 'r') as f:
            data = yaml.safe_load(f)
            if not data: return []
            
            for site in data.get('sites', []):
                for room in site.get('rooms', []):
                    # Racks in aisles
                    for aisle in room.get('aisles', []):
                        for rack in aisle.get('racks', []):
                            racks.append({
                                'site_id': site['id'], 
                                'room_id': room['id'], 
                                'rack_id': rack['id']
                            })
                    # Standalone racks
                    for rack in room.get('standalone_racks', []):
                        racks.append({
                            'site_id': site['id'], 
                            'room_id': room['id'], 
                            'rack_id': rack['id']
                        })
    except Exception as e:
        print(f"Error loading topology: {e}")
    return racks

def simulate():
    """Update metrics with simulated values."""
    racks = load_racks()
    print(f"Simulating metrics for {len(racks)} racks...")
    
    # Simulation state to create continuity
    tick = 0
    
    while True:
        tick += 1
        for rack in racks:
            labels = {k: v for k, v in rack.items()}
            
            # Seed random with rack_id so behavior is consistent per rack
            random.seed(rack['rack_id'] + str(tick))
            
            # Temperature: Base 22°C + Sine wave for day/night cycle simulation + random noise
            # Result: fluctuates between 20°C and 28°C usually
            base_temp = 22 + (math.sin(tick / 20.0) * 2) 
            noise = random.uniform(-1.0, 1.5)
            temp = base_temp + noise
            
            # Create a "hotspot" scenario for one specific rack occasionally
            if "crit" in rack['rack_id'] or (random.random() > 0.98):
                temp += 10 # Sudden heat spike
            
            RACK_TEMP.labels(**labels).set(round(temp, 1))
            
            # Power: Random fluctuation around 3-5kW
            power = 3500 + random.uniform(-500, 1500)
            if temp > 30: 
                power += 1000 # Fans spinning faster!
                
            RACK_POWER.labels(**labels).set(round(power, 0))
            
            # Health Status logic based on simulated values
            status = 0 # OK
            if temp > 35:
                status = 2 # CRIT
            elif temp > 28:
                status = 1 # WARN
                
            RACK_HEALTH.labels(**labels).set(status)

        time.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    # Start up the server to expose the metrics.
    print("Starting Prometheus Exporter on port 9000")
    start_http_server(9000)
    simulate()
