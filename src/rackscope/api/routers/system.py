"""
System Router

Endpoints for system operations (restart, status, etc.)
"""

import os
import re
import logging
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException

from rackscope.api.dependencies import require_admin

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])


def _read_proc_metric(text: str, metric_name: str) -> float | None:
    """Parse a single metric value from Prometheus text-format /metrics output."""
    for line in text.splitlines():
        if line.startswith(metric_name + " ") or line.startswith(metric_name + "{"):
            # Match lines like: process_resident_memory_bytes 134217728.0
            # or: process_resident_memory_bytes{} 134217728.0
            parts = line.rsplit(" ", 1)
            if len(parts) == 2:
                try:
                    return float(parts[1])
                except ValueError:
                    pass
    return None


def _parse_backend_stats() -> dict:
    """Read backend process memory from /proc/self/status (Linux only)."""
    mem_bytes: float | None = None
    cpu_seconds: float | None = None
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    kb = int(re.sub(r"[^0-9]", "", line.split(":")[1]))
                    mem_bytes = kb * 1024
                    break
    except FileNotFoundError:
        logger.debug("/proc/self/status not available (non-Linux host)")
    except Exception as e:
        logger.warning("Failed to read backend memory stats: %s", e)
    try:
        with open("/proc/self/stat") as f:
            fields = f.read().split()
            # fields[13] = utime, fields[14] = stime (in jiffies; use SC_CLK_TCK for accuracy)
            utime = int(fields[13])
            stime = int(fields[14])
            hz = float(os.sysconf("SC_CLK_TCK"))
            cpu_seconds = (utime + stime) / hz
    except FileNotFoundError:
        logger.debug("/proc/self/stat not available (non-Linux host)")
    except Exception as e:
        logger.warning("Failed to read backend CPU stats: %s", e)
    return {"memory_bytes": mem_bytes, "cpu_seconds": cpu_seconds, "available": True}


async def _fetch_process_stats_raw(url: str) -> dict:
    """Fetch /metrics from a service and extract process_* stats (fast endpoints only)."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            text = resp.text
        mem = _read_proc_metric(text, "process_resident_memory_bytes")
        cpu = _read_proc_metric(text, "process_cpu_seconds_total")
        return {"memory_bytes": mem, "cpu_seconds": cpu, "available": True}
    except Exception:
        return {"memory_bytes": None, "cpu_seconds": None, "available": False}


async def _query_prom_process_stats(prometheus_base: str, instance_selector: str) -> dict:
    """Query Prometheus API for process metrics of a given instance."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            mem_r, cpu_r = await asyncio.gather(
                client.get(
                    f"{prometheus_base}/api/v1/query",
                    params={"query": f"process_resident_memory_bytes{{{instance_selector}}}"},
                ),
                client.get(
                    f"{prometheus_base}/api/v1/query",
                    params={"query": f"process_cpu_seconds_total{{{instance_selector}}}"},
                ),
            )

        def _extract(r: httpx.Response) -> float | None:
            data = r.json()
            results = data.get("data", {}).get("result", [])
            if results:
                return float(results[0]["value"][1])
            return None

        return {
            "memory_bytes": _extract(mem_r),
            "cpu_seconds": _extract(cpu_r),
            "available": True,
        }
    except Exception:
        return {"memory_bytes": None, "cpu_seconds": None, "available": False}


@router.post("/api/system/restart", dependencies=[Depends(require_admin)])
async def restart_backend():
    """
    Restart the backend server.

    This endpoint touches the main app file to trigger uvicorn --reload.
    Requires uvicorn to be running with --reload flag (dev mode).

    Returns:
        Message confirming restart initiated
    """
    import asyncio
    from pathlib import Path

    try:
        pid = os.getpid()
        logger.info(f"Restart requested for process {pid}")

        # Touch the main app.py file to trigger uvicorn reload
        # system.py is in api/routers/, app.py is in api/
        app_file = Path(__file__).parent.parent / "app.py"
        if app_file.exists():
            app_file.touch()
            logger.info(f"Touched {app_file} to trigger reload")

            # Give the response time to send before reload happens
            async def delayed_touch():  # pragma: no cover
                await asyncio.sleep(0.5)
                app_file.touch()

            asyncio.create_task(delayed_touch())

        return {"status": "ok", "message": "Backend restart initiated"}
    except Exception as e:
        logger.error(f"Failed to restart backend: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restart: {str(e)}")


@router.get("/api/system/status")
def get_system_status():
    """Get system status information."""
    return {
        "status": "running",
        "pid": os.getpid(),
    }


@router.get("/api/system/process-stats", dependencies=[Depends(require_admin)])
async def get_process_stats():
    """
    Return memory and CPU usage for backend, simulator, and Prometheus.

    - backend: read from /proc/self/ (Linux)
    - simulator: fetch http://simulator:9000/metrics
    - prometheus: fetch http://prometheus:9090/metrics
    """
    prometheus_base = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")
    prometheus_metrics_url = prometheus_base + "/metrics"
    # Simulator /metrics is too slow for large topologies — use Prometheus query instead.
    # The simulator scrape job relabels all metrics with job=node, instance stays as host:port.
    simulator_instance = os.getenv("SIMULATOR_INSTANCE_LABEL", "simulator:9000")

    backend_stats = _parse_backend_stats()
    simulator_stats, prometheus_stats = await asyncio.gather(
        _query_prom_process_stats(prometheus_base, f'instance="{simulator_instance}"'),
        _fetch_process_stats_raw(prometheus_metrics_url),
    )

    return {
        "backend": backend_stats,
        "simulator": simulator_stats,
        "prometheus": prometheus_stats,
    }
