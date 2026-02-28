"""
Middleware

FastAPI middleware for request logging and tracing.
"""

import time
import uuid
import logging
from typing import Callable

from fastapi import Request, Response
from jose import jwt as _jwt, JWTError as _JWTError  # type: ignore[import-untyped]
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all incoming requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            The response from the handler
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log error and re-raise (will be caught by exception handler)
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"{request.method} {request.url.path} - Exception",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                    "exception": str(exc),
                },
            )
            raise

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log request
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response  # type: ignore[no-any-return]


# Public paths that never require authentication
_AUTH_PUBLIC_PATHS = {"/api/auth/login", "/api/auth/status"}


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT Bearer token validation middleware.

    Skips validation when auth is disabled in config.
    Exempts /api/auth/login and /api/auth/status.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        from rackscope.api.app import APP_CONFIG, AUTH_RUNTIME_SECRET

        # Skip if auth not configured or disabled
        if not APP_CONFIG or not APP_CONFIG.auth.enabled:
            return await call_next(request)  # type: ignore[no-any-return]

        # Always allow public auth endpoints
        if request.url.path in _AUTH_PUBLIC_PATHS:
            return await call_next(request)  # type: ignore[no-any-return]

        # Extract Bearer token
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        token = auth_header[7:]
        secret = APP_CONFIG.auth.secret_key or AUTH_RUNTIME_SECRET

        try:
            payload = _jwt.decode(token, secret, algorithms=["HS256"])
            request.state.user = payload.get("sub", "")
        except _JWTError:
            return JSONResponse({"detail": "Invalid or expired token"}, status_code=401)

        return await call_next(request)  # type: ignore[no-any-return]
