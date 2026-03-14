"""
Logs Router

Endpoints for accessing application logs from the Web UI.

All endpoints require admin access (require_admin dependency).
Sensitive fields are redacted in the LogBuffer at capture time.
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from rackscope.api.dependencies import require_admin
from rackscope.api.log_buffer import log_buffer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/logs", tags=["logs"])

# SSE constants
_SSE_POLL_INTERVAL = 0.5  # seconds between buffer polls
_SSE_HEARTBEAT_INTERVAL = 30  # seconds between keep-alive pings
_SSE_MAX_DURATION = 600  # max SSE connection lifetime (10 min)
_SSE_MAX_CONCURRENT = 5  # max simultaneous SSE subscribers


# Simple semaphore to cap concurrent SSE connections
_sse_semaphore = asyncio.Semaphore(_SSE_MAX_CONCURRENT)


@router.get("")
def get_logs(
    n: int = 200,
    level: Optional[str] = None,
    search: Optional[str] = None,
    since_seq: int = 0,
    _: None = Depends(require_admin),
):
    """Return recent log entries from the in-memory buffer.

    Args:
        n:          Max number of records to return (default 200, max 1000).
        level:      Filter by level: DEBUG, INFO, WARNING, ERROR.
        search:     Case-insensitive substring filter on message or logger name.
        since_seq:  Return only records newer than this sequence number.
    """
    n = min(max(1, n), 1000)
    records = log_buffer.recent(n=n, level=level, search=search, since_seq=since_seq)
    return {
        "records": records,
        "total": len(records),
        "last_seq": log_buffer.last_seq(),
    }


@router.delete("")
def clear_logs(_: None = Depends(require_admin)):
    """Clear the in-memory log buffer."""
    log_buffer.clear()
    return {"ok": True, "message": "Log buffer cleared"}


@router.get("/stream")
async def stream_logs(
    level: Optional[str] = None,
    search: Optional[str] = None,
    _: None = Depends(require_admin),
):
    """Stream log entries as Server-Sent Events.

    Connect with EventSource from the browser. New log entries are pushed
    every ~0.5 s. A heartbeat comment is sent every 30 s to keep the
    connection alive through proxies.

    The connection closes automatically after 10 minutes.

    SSE event format::

        data: {"_seq": 42, "timestamp": "...", "level": "INFO", ...}\\n\\n

    Heartbeat format::

        : ping\\n\\n
    """
    if not _sse_semaphore._value:  # noqa: SLF001  — check without acquiring

        async def _too_many():
            yield 'data: {"error": "Too many concurrent log streams"}\n\n'

        return StreamingResponse(_too_many(), media_type="text/event-stream")

    async def event_generator():
        since_seq = log_buffer.last_seq()
        elapsed = 0.0
        heartbeat_elapsed = 0.0

        async with asyncio.timeout(_SSE_MAX_DURATION):
            async with _sse_semaphore_ctx():
                while True:
                    try:
                        records = log_buffer.recent(
                            n=100,
                            level=level,
                            search=search,
                            since_seq=since_seq,
                        )
                        for record in records:
                            since_seq = record["_seq"]
                            yield f"data: {json.dumps(record)}\n\n"

                        await asyncio.sleep(_SSE_POLL_INTERVAL)
                        elapsed += _SSE_POLL_INTERVAL
                        heartbeat_elapsed += _SSE_POLL_INTERVAL

                        if heartbeat_elapsed >= _SSE_HEARTBEAT_INTERVAL:
                            yield ": ping\n\n"
                            heartbeat_elapsed = 0.0

                    except asyncio.CancelledError:
                        break
                    except Exception as exc:
                        logger.warning("SSE log stream error: %s", exc)
                        break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable Nginx buffering
        },
    )


class _sse_semaphore_ctx:
    """Async context manager that acquires / releases the SSE semaphore."""

    async def __aenter__(self):
        await _sse_semaphore.acquire()

    async def __aexit__(self, *_):
        _sse_semaphore.release()
