from __future__ import annotations

import os
import httpx
from typing import Dict, Any, Optional
from datetime import datetime

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

    async def get_rack_temperatures(self) -> Dict[str, float]:
        """Fetch average temperature per rack."""
        # Query: average temperature by rack_id
        # We group by rack_id to match our topology model
        q = "avg(rack_temperature_celsius) by (rack_id)"
        result = await self.query(q)
        
        temps = {}
        if result.get("status") == "success":
            for item in result["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                value = float(item["value"][1])
                if rack_id:
                    temps[rack_id] = value
        return temps

    async def get_rack_power(self) -> Dict[str, float]:
        """Fetch power consumption per rack."""
        q = "sum(rack_power_watts) by (rack_id)"
        result = await self.query(q)
        
        power = {}
        if result.get("status") == "success":
            for item in result["data"]["result"]:
                rack_id = item["metric"].get("rack_id")
                value = float(item["value"][1])
                if rack_id:
                    power[rack_id] = value
        return power

# Global instance
client = PrometheusClient()
