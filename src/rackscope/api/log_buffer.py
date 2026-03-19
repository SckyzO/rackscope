"""
Log Buffer

Thread-safe in-memory ring buffer for recent application log entries.
Used by the /api/logs endpoints to expose backend logs in the Web UI.

Security:
- Sensitive values (passwords, tokens, URL credentials) are redacted at
  capture time via regex, before any record reaches the buffer.
- The buffer and all endpoints are protected by require_admin.
- Buffer is never persisted to disk.
"""

import collections
import logging
import re
import threading
from datetime import datetime, timezone
from typing import Any, Optional

# ── Sensitive field redaction ─────────────────────────────────────────────────

_REDACT_PATTERNS: list[tuple[re.Pattern, str]] = [
    # URL-embedded credentials: http://user:secret@host → http://user:***@host
    (re.compile(r"(://[^:/@\s]+):([^@\s]+)@"), r"\1:***@"),
    # key=value patterns for common secret names
    (
        re.compile(
            r"(?i)\b(password|passwd|secret[_-]?key?|token|bearer|api[_-]?key|auth(?:orization)?)"
            r"\s*[=:]\s*\S+",
        ),
        r"\1=***",
    ),
]


def _redact(text: str) -> str:
    """Apply all redaction patterns to a log message string."""
    for pattern, replacement in _REDACT_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# ── Sequence counter ──────────────────────────────────────────────────────────

_seq_lock = threading.Lock()
_seq_counter: int = 0


def _next_seq() -> int:
    global _seq_counter
    with _seq_lock:
        _seq_counter += 1
        return _seq_counter


# ── LogBuffer ─────────────────────────────────────────────────────────────────

_DEFAULT_MAXLEN = 1_000


class LogBuffer:
    """Thread-safe in-memory ring buffer for structured log entries.

    Records are stored as plain dicts (already serializable to JSON).
    Each record has a monotonically increasing ``_seq`` field so SSE
    clients can request only new entries via ``since_seq``.

    Usage::

        buffer = LogBuffer()
        # install via LogCaptureHandler
        # query via /api/logs
    """

    def __init__(self, maxlen: int = _DEFAULT_MAXLEN) -> None:
        self._lock = threading.Lock()
        self._buf: collections.deque[dict[str, Any]] = collections.deque(maxlen=maxlen)

    def add(self, record: dict[str, Any]) -> None:
        """Append a log record. Thread-safe."""
        with self._lock:
            self._buf.append(record)

    def recent(
        self,
        n: int = 200,
        level: Optional[str] = None,
        search: Optional[str] = None,
        since_seq: int = 0,
    ) -> list[dict[str, Any]]:
        """Return up to ``n`` recent records, newest last.

        Args:
            n:         Maximum number of records to return.
            level:     If set, filter to this log level (case-insensitive).
            search:    If set, keep only records whose message or logger
                       contains this string (case-insensitive).
            since_seq: If > 0, return only records with ``_seq`` > this value.
        """
        with self._lock:
            records = list(self._buf)

        if since_seq > 0:
            records = [r for r in records if r.get("_seq", 0) > since_seq]
        if level:
            lvl = level.upper()
            records = [r for r in records if r.get("level", "").upper() == lvl]
        if search:
            s = search.lower()
            records = [
                r
                for r in records
                if s in r.get("message", "").lower() or s in r.get("logger", "").lower()
            ]

        return records[-n:]

    def clear(self) -> None:
        """Empty the buffer (admin action)."""
        with self._lock:
            self._buf.clear()

    def last_seq(self) -> int:
        """Return the _seq of the most recent record, or 0 if empty."""
        with self._lock:
            if not self._buf:
                return 0
            return int(self._buf[-1].get("_seq", 0))


# ── LogCaptureHandler ─────────────────────────────────────────────────────────


class LogCaptureHandler(logging.Handler):
    """Python logging handler that writes records into a LogBuffer.

    Install alongside the existing StreamHandler::

        buffer = LogBuffer()
        handler = LogCaptureHandler(buffer)
        logging.getLogger().addHandler(handler)
    """

    def __init__(self, buffer: LogBuffer) -> None:
        super().__init__()
        self._buffer = buffer

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        try:
            message = _redact(record.getMessage())
            entry: dict[str, Any] = {
                "_seq": _next_seq(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "message": message,
            }
            # Carry structured extra fields set by RequestLoggingMiddleware
            for field in ("request_id", "duration_ms", "method", "path", "status_code"):
                if hasattr(record, field):
                    entry[field] = getattr(record, field)
            if record.exc_info:
                formatter = logging.Formatter()
                entry["exception"] = formatter.formatException(record.exc_info)
            self._buffer.add(entry)
        except Exception:
            self.handleError(record)


# ── Module-level singleton ────────────────────────────────────────────────────

#: Global buffer — installed by setup_logging(), queried by /api/logs
log_buffer: LogBuffer = LogBuffer()
