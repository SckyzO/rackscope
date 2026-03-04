"""
System Router

Endpoints for system operations (restart, status, etc.)
"""

import os
import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system"])


@router.post("/api/system/restart")
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
