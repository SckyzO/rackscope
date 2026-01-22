from __future__ import annotations

import os
import httpx
from typing import Dict, Any, List

# Default to internal docker network hostname if not set
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")

class PrometheusClient:
    def __init__(self, base_url: str = PROMETHEUS_URL):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=2.0)

    async def query(self, query: str) -> Dict[str, Any]:
        """Execute a PromQL instant query."""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/query",
                params={"query": query}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Prometheus query error: {e}")
            return {"status": "error", "error": str(e)}

    async def get_node_metrics(self, rack_id: str) -> Dict[str, Any]:
        """Fetch metrics for all nodes in a specific rack."""
        # We fetch temperature for all nodes in this rack
        q_temp = f'node_temperature_celsius{{rack_id="{rack_id}"}}'
        q_power = f'node_power_watts{{rack_id="{rack_id}"}}'
        
        # Parallel fetch
        results = {}
        try:
            # Note: httpx usage here should be optimized with gather in real prod
            res_temp = await self.query(q_temp)
            res_power = await self.query(q_power)
            
            # Parse Temperatures
            if res_temp.get("status") == "success":
                for item in res_temp["data"]["result"]:
                    node_id = item["metric"].get("node_id")
                    val = float(item["value"][1])
                    if node_id:
                        if node_id not in results: results[node_id] = {}
                        results[node_id]["temperature"] = val

            # Parse Power
            if res_power.get("status") == "success":
                for item in res_power["data"]["result"]:
                    node_id = item["metric"].get("node_id")
                    val = float(item["value"][1])
                    if node_id:
                        if node_id not in results: results[node_id] = {}
                        results[node_id]["power"] = val
                        
        except Exception as e:
            print(f"Error fetching node metrics: {e}")
            
        return results

    async def get_rack_health_summary(self) -> Dict[str, str]:
        """Get aggregated health status per rack based on nodes."""
        # If any node is > 35°C, rack is CRIT. If > 30°C, WARN.
        # We do this aggregation in PromQL for efficiency.
        
        # Count critical nodes per rack
        q_crit = 'count(node_temperature_celsius > 35) by (rack_id)'
        q_warn = 'count(node_temperature_celsius > 30) by (rack_id)'
        
        health_map = {}
        
        # Initialize default OK (we assume all known racks are OK unless proven otherwise)
        # In a real app we'd merge with topology list
        
        res_crit = await self.query(q_crit)
        res_warn = await self.query(q_warn)
        
        if res_warn.get("status") == "success":
            for item in res_warn["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                if rack_id: health_map[rack_id] = "WARN"

        if res_crit.get("status") == "success":
            for item in res_crit["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                if rack_id: health_map[rack_id] = "CRIT"
                
        return health_map

# Global instance
client = PrometheusClient()