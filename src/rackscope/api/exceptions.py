"""
Exception Handlers

Global exception handlers for structured error responses.
"""

import logging
from typing import Any, Dict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

logger = logging.getLogger(__name__)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors.

    Args:
        request: The FastAPI request
        exc: The validation error

    Returns:
        Structured JSON error response
    """
    # Clean errors to make them JSON-serializable
    errors = []
    for error in exc.errors():
        cleaned_error = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "input": error.get("input"),
        }
        # Convert context exceptions to strings
        if "ctx" in error and error["ctx"]:
            cleaned_ctx = {}
            for key, value in error["ctx"].items():
                if isinstance(value, Exception):
                    cleaned_ctx[key] = str(value)
                else:
                    cleaned_ctx[key] = value
            cleaned_error["ctx"] = cleaned_ctx
        errors.append(cleaned_error)

    logger.warning(
        f"Validation error on {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "errors": errors,
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": "Validation error",
            "detail": errors,
            "path": request.url.path,
        },
    )


async def pydantic_validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle generic Pydantic validation errors.

    Args:
        request: The FastAPI request
        exc: The validation error

    Returns:
        Structured JSON error response
    """
    logger.warning(
        f"Pydantic validation error on {request.method} {request.url.path}",
        extra={
            "method": request.method,
            "path": request.url.path,
            "errors": exc.errors(),
        },
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": "Validation error",
            "detail": exc.errors(),
            "path": request.url.path,
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions.

    Args:
        request: The FastAPI request
        exc: The exception

    Returns:
        Structured JSON error response
    """
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
        extra={
            "method": request.method,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
        },
    )

    # Don't expose internal error details in production
    error_detail: Dict[str, Any] = {
        "error": "Internal server error",
        "path": request.url.path,
    }

    # In development, include exception details
    # This could be controlled by an environment variable
    import os

    if os.getenv("RACKSCOPE_DEBUG", "false").lower() == "true":
        error_detail["exception"] = str(exc)
        error_detail["type"] = type(exc).__name__

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_detail,
    )
