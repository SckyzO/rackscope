"""
Logging Configuration

Structured logging setup for rackscope application.
"""

import logging
import os
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON.

        Args:
            record: The log record to format

        Returns:
            JSON-formatted log string
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "rack_id"):
            log_data["rack_id"] = record.rack_id
        if hasattr(record, "room_id"):
            log_data["room_id"] = record.room_id
        if hasattr(record, "device_id"):
            log_data["device_id"] = record.device_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        return json.dumps(log_data)


def setup_logging() -> None:
    """Setup structured logging for the application."""
    # Get log level from environment variable
    log_level_str = os.getenv("RACKSCOPE_LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    # Use JSON formatter for structured logs
    json_formatter = JSONFormatter()
    console_handler.setFormatter(json_formatter)

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Set level for specific loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance.

    Args:
        name: The name of the logger (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
