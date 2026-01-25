import argparse
from pathlib import Path
import yaml

def generate():
    sites = []
    
    # --- ROOM A (HPC) ---
    aisles = []
    
    # AISLE 01: COMPUTE (6 CPU Racks + 4 GPU Racks)
    # Total: 10 Racks
    aisle01_racks = []
    
    # 6 CPU Racks (01-06)
    # 20x 1U Twin (2 nodes) = 40 nodes/rack
    cpu_node_counter = 1
    
    for i in range(1, 7):
        rack_id = f"r01-{i:02d}"
        devices = []
        
        # Top Switches
        devices.append({
            "id": f"{rack_id}-isw", "name": f"isw-l1-{i:02d}", 
            "template_id": "ib-switch-l1", "u_position": 42
        })
        devices.append({
            "id": f"{rack_id}-esw", "name": f"esw-{i:02d}", 
            "template_id": "eth-switch-tor", "u_position": 41
        })
        
        # 20 Chassis x 2 Nodes
        # U1 to U40 (every 2U? No 1U twin is 1U high)
        # Let's stack them 1 to 20
        # Wait, user said "Full CPU (1U 2nodes)". 
        # XH3000 is 48U. Let's fill U1 to U40.
        
        for u in range(1, 41): # 40 Chassis of 1U? That's 80 nodes per rack!
            # Let's stick to 40 chassis (U1 to U40)
            start_node = cpu_node_counter
            end_node = cpu_node_counter + 1
            cpu_node_counter += 2
            
            node_pattern = f"compute[{start_node:03d}-{end_node:03d}]" # compute001, compute002...
            
            devices.append({
                "id": f"{rack_id}-c{u:02d}",
                "name": f"Compute Encl {u:02d}",
                "template_id": "bs-1u-twin-cpu",
                "u_position": u,
                "nodes": node_pattern
            })
            
        aisle01_racks.append({
            "id": rack_id, "name": f"Rack CPU {i:02d}",
            "template_id": "bull-xh3000", "u_height": 48,
            "devices": devices
        })

    # 4 GPU Racks (07-10)
    # 4U Quad GPU. 40U / 4 = 10 chassis. 10 * 4 = 40 nodes per rack.
    gpu_node_counter = 1
    
    for i in range(7, 11):
        rack_id = f"r01-{i:02d}"
        devices = []
        
        # Switches
        devices.append({
            "id": f"{rack_id}-isw", "name": f"isw-l1-{i:02d}", 
            "template_id": "ib-switch-l1", "u_position": 42
        })
        devices.append({
            "id": f"{rack_id}-esw", "name": f"esw-{i:02d}", 
            "template_id": "eth-switch-tor", "u_position": 41
        })
        
        # 10 Chassis (4U each)
        for slot_idx in range(10): 
            u_pos = 1 + (slot_idx * 4) # 1, 5, 9...
            
            start_node = gpu_node_counter
            end_node = gpu_node_counter + 3
            gpu_node_counter += 4
            
            node_pattern = f"gpu[{start_node:03d}-{end_node:03d}]"
            
            devices.append({
                "id": f"{rack_id}-g{slot_idx+1:02d}",
                "name": f"GPU Encl {slot_idx+1:02d}",
                "template_id": "bs-4u-quad-gpu",
                "u_position": u_pos,
                "nodes": node_pattern
            })
            
        aisle01_racks.append({
            "id": rack_id, "name": f"Rack GPU {i:02d}",
            "template_id": "bull-xh3000", "u_height": 48,
            "devices": devices
        })

    aisles.append({"id": "aisle-01", "name": "Aisle 01 (Compute)", "racks": aisle01_racks})

    # AISLE 02: STORAGE (4 Racks)
    aisle02_racks = []
    for i in range(1, 5):
        rack_id = f"r02-{i:02d}"
        devices = []
        
        # Switches
        devices.append({
            "id": f"{rack_id}-esw", "name": f"esw-stor-{i:02d}", 
            "template_id": "eth-switch-tor", "u_position": 42
        })
        
        # 2 Computes Generiques 1U (U25-26)
        devices.append({"id": f"{rack_id}-gw1", "name": f"io-node-{i}-a", "template_id": "srv-1u-mgmt", "u_position": 25, "nodes": {1: f"io{i}a"}})
        devices.append({"id": f"{rack_id}-gw2", "name": f"io-node-{i}-b", "template_id": "srv-1u-mgmt", "u_position": 26, "nodes": {1: f"io{i}b"}})
        
        # 1 NetApp 2U (U23)
        devices.append({
            "id": f"{rack_id}-netapp", "name": "NetApp Controller", 
            "template_id": "storage-2u-24disk", "u_position": 23,
            "nodes": f"ssd-r{i}[01-24]"
        })
        
        # 5 Disk Arrays 4U (U1-U20) -> U1, U5, U9, U13, U17
        for da in range(5):
            u_pos = 1 + (da * 4)
            devices.append({
                "id": f"{rack_id}-da{da+1}", "name": f"Disk Array {da+1}", 
                "template_id": "storage-4u-60disk", "u_position": u_pos,
                "nodes": f"hdd-r{i}-d{da+1}[01-60]"
            })
            
        aisle02_racks.append({
            "id": rack_id, "name": f"Rack Storage {i:02d}",
            "template_id": "standard-42u-air", "u_height": 42,
            "devices": devices
        })
        
    aisles.append({"id": "aisle-02", "name": "Aisle 02 (Storage)", "racks": aisle02_racks})

    # AISLE 03: MANAGEMENT
    aisle03_racks = []
    
    # Rack 03-01
    r3_devices = []
    
    # L2 Switch
    r3_devices.append({
        "id": "r03-01-isw-l2", "name": "isw-l2-01 (Core)",
        "template_id": "ib-switch-l2", "u_position": 41 # 2U so 41-42
    })
    
    # 2 Mngt 1U (U20-21)
    r3_devices.append({"id": "mngt01", "name": "mngt01", "template_id": "srv-1u-mgmt", "u_position": 20, "nodes": {1: "mngt01"}})
    r3_devices.append({"id": "mngt02", "name": "mngt02", "template_id": "srv-1u-mgmt", "u_position": 21, "nodes": {1: "mngt02"}})
    
    # 4 Logins 1U (U16-19)
    for l in range(1, 5):
        r3_devices.append({"id": f"login{l:02d}", "name": f"login{l:02d}", "template_id": "srv-1u-mgmt", "u_position": 15+l, "nodes": {1: f"login{l:02d}"}})
        
    # 6 Visus 2U Twin (12 nodes) (U04-15)
    # U4, U6, U8, U10, U12, U14
    visu_node_counter = 1
    for v in range(6):
        u_pos = 4 + (v * 2)
        start = visu_node_counter
        end = visu_node_counter + 1
        visu_node_counter += 2
        r3_devices.append({
            "id": f"visu-ch-{v+1}", "name": f"Visu Chassis {v+1}",
            "template_id": "bs-2u-twin-visu", "u_position": u_pos,
            "nodes": f"visu[{start:02d}-{end:02d}]"
        })

    aisle03_racks.append({
        "id": "r03-01", "name": "Rack Mgmt 01",
        "template_id": "standard-42u-air", "u_height": 42,
        "devices": r3_devices
    })
    
    aisles.append({"id": "aisle-03", "name": "Aisle 03 (Services)", "racks": aisle03_racks})

    sites.append({
        "id": "dc1", "name": "Main Datacenter",
        "rooms": [{"id": "room-a", "name": "HPC Cluster Room A", "aisles": aisles}]
    })
    
    return {"sites": sites}

def main():
    parser = argparse.ArgumentParser(description="Generate a test topology YAML.")
    parser.add_argument(
        "-o",
        "--output",
        default="config/topology",
        help="Output path for the generated topology (dir or YAML file).",
    )
    args = parser.parse_args()

    data = generate()
    output = Path(args.output)
    if output.suffix == ".yaml":
        output.parent.mkdir(parents=True, exist_ok=True)
        with open(output, "w") as f:
            yaml.dump(data, f, sort_keys=False)
        print(f"Topology generated: {output}")
        return

    base = output
    rooms_root = base / "datacenters"
    rooms_root.mkdir(parents=True, exist_ok=True)

    sites_out = []
    for site in data.get("sites", []):
        site_id = site.get("id")
        if not site_id:
            continue
        site_name = site.get("name", site_id)
        rooms_out = []
        for room in site.get("rooms", []):
            room_id = room.get("id")
            if not room_id:
                continue
            room_name = room.get("name", room_id)
            rooms_out.append({"id": room_id, "name": room_name})

            room_dir = base / "datacenters" / site_id / "rooms" / room_id
            (room_dir / "aisles").mkdir(parents=True, exist_ok=True)
            (room_dir / "standalone_racks").mkdir(parents=True, exist_ok=True)

            room_out = {"id": room_id, "name": room_name, "aisles": [], "standalone_racks": []}
            aisles_out = []
            for aisle in room.get("aisles", []):
                aisle_id = aisle.get("id")
                if not aisle_id:
                    continue
                aisle_name = aisle.get("name", aisle_id)
                aisles_out.append({"id": aisle_id, "name": aisle_name})

                aisle_dir = room_dir / "aisles" / aisle_id
                (aisle_dir / "racks").mkdir(parents=True, exist_ok=True)
                racks_list = []
                for rack in aisle.get("racks", []):
                    rack_id = rack.get("id")
                    if not rack_id:
                        continue
                    racks_list.append(rack_id)
                    rack_file = aisle_dir / "racks" / f"{rack_id}.yaml"
                    rack_file.write_text(yaml.safe_dump(rack, sort_keys=False))
                aisle_yaml = {"id": aisle_id, "name": aisle_name, "racks": racks_list}
                (aisle_dir / "aisle.yaml").write_text(yaml.safe_dump(aisle_yaml, sort_keys=False))
            room_out["aisles"] = aisles_out

            for rack in room.get("standalone_racks", []):
                rack_id = rack.get("id")
                if not rack_id:
                    continue
                room_out["standalone_racks"].append(rack_id)
                rack_file = room_dir / "standalone_racks" / f"{rack_id}.yaml"
                rack_file.write_text(yaml.safe_dump(rack, sort_keys=False))

            (room_dir / "room.yaml").write_text(yaml.safe_dump(room_out, sort_keys=False))

        sites_out.append({"id": site_id, "name": site_name, "rooms": rooms_out})

    (base / "sites.yaml").write_text(yaml.safe_dump({"sites": sites_out}, sort_keys=False))
    print(f"Topology generated: {base}")

if __name__ == "__main__":
    main()
