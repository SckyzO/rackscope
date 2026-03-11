"""
Auth Router

Endpoints for authentication: login, session info, credential management.
"""

from __future__ import annotations

import os
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

import bcrypt as _bcrypt
import yaml
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
import jwt as _jwt_lib
from jwt.exceptions import InvalidTokenError as JWTError

from rackscope.model.config import AppConfig, PasswordPolicyConfig

router = APIRouter(prefix="/api/auth", tags=["auth"])

_login_attempts: dict[str, list[float]] = defaultdict(list)
_LOGIN_WINDOW_SECONDS = 900  # 15 minutes
_LOGIN_MAX_ATTEMPTS = 10  # per window


def _check_login_rate_limit(identifier: str) -> None:
    """Raise 429 if the identifier has exceeded the login attempt threshold."""
    now = time.monotonic()
    attempts = [t for t in _login_attempts[identifier] if now - t < _LOGIN_WINDOW_SECONDS]
    _login_attempts[identifier] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again in {_LOGIN_WINDOW_SECONDS // 60} minutes.",
        )
    _login_attempts[identifier].append(now)


def _hash_password(password: str) -> str:
    # rounds=13 gives ~200ms on modern CPU — good balance of security and UX
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=13)).decode()


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(password.encode(), hashed.encode())
    except (ValueError, UnicodeDecodeError) as e:
        import logging

        logging.getLogger(__name__).warning("Password verification error (corrupted hash?): %s", e)
        return False
    except Exception as e:
        import logging

        logging.getLogger(__name__).error("Unexpected error in password verification: %s", e)
        return False


_SYMBOLS = set("!@#$%^&*()_+-=[]{}|;:'\",.<>?/\\`~")


def _validate_policy(password: str, policy: PasswordPolicyConfig) -> Optional[str]:
    """Returns an error message if the password violates the policy, else None."""
    if len(password) < policy.min_length:
        return f"Password must be at least {policy.min_length} characters"
    if len(password) > policy.max_length:
        return f"Password must be at most {policy.max_length} characters"
    if policy.require_digit and not any(c.isdigit() for c in password):
        return "Password must contain at least one digit (0–9)"
    if policy.require_symbol and not any(c in _SYMBOLS for c in password):
        return "Password must contain at least one symbol (!@#$…)"
    return None


# ── Dependency helpers ────────────────────────────────────────────────────────


def get_app_config() -> Optional[AppConfig]:
    from rackscope.api.app import APP_CONFIG

    return APP_CONFIG


def _secret_key(app_config: AppConfig) -> str:
    """Return secret key from config, falling back to the process-level runtime key."""
    from rackscope.api.app import AUTH_RUNTIME_SECRET

    if app_config.auth.secret_key:
        return app_config.auth.secret_key
    return AUTH_RUNTIME_SECRET


def _token_expiry(session_duration: str) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if session_duration == "8h":
        return now + timedelta(hours=8)
    if session_duration == "24h":
        return now + timedelta(hours=24)
    return None  # unlimited — no expiry


def _make_token(username: str, secret: str, expires: Optional[datetime]) -> str:
    payload: dict = {"sub": username}
    if expires:
        payload["exp"] = expires
    return _jwt_lib.encode(payload, secret, algorithm="HS256")


def _decode_token(token: str, secret: str) -> str:
    """Decode token and return username. Raises HTTPException on failure."""
    try:
        payload = _jwt_lib.decode(token, secret, algorithms=["HS256"])
        username: Optional[str] = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def _current_user(request: Request) -> str:
    """Dependency: extract and validate Bearer token from request."""
    return getattr(request.state, "user", None) or ""


# ── Request / Response models ─────────────────────────────────────────────────


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int]  # seconds; None = unlimited
    username: str


class AuthStatusResponse(BaseModel):
    enabled: bool
    configured: bool  # has a password hash been set?
    username: str
    policy: PasswordPolicyConfig = Field(default_factory=PasswordPolicyConfig)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeUsernameRequest(BaseModel):
    password: str
    new_username: str


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/status", response_model=AuthStatusResponse)
def auth_status(app_config: Annotated[Optional[AppConfig], Depends(get_app_config)]):
    """Public endpoint — frontend uses this to decide whether to show login."""
    if not app_config:
        return AuthStatusResponse(enabled=False, configured=False, username="admin")
    return AuthStatusResponse(
        enabled=app_config.auth.enabled,
        configured=bool(app_config.auth.password_hash),
        username=app_config.auth.username,
        policy=app_config.auth.policy,
    )


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config)],
):
    """Validate credentials and return a JWT."""
    _check_login_rate_limit(body.username)
    if not app_config or not app_config.auth.enabled:
        raise HTTPException(status_code=400, detail="Authentication is not enabled")

    auth = app_config.auth
    # Username check
    if body.username != auth.username:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Password check — empty hash means not yet configured
    if not auth.password_hash:
        raise HTTPException(status_code=401, detail="No password configured")

    if not _verify_password(body.password, auth.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    secret = _secret_key(app_config)
    expires = _token_expiry(auth.session_duration)
    token = _make_token(auth.username, secret, expires)

    expires_in: Optional[int] = None
    if auth.session_duration == "8h":
        expires_in = 8 * 3600
    elif auth.session_duration == "24h":
        expires_in = 24 * 3600

    return LoginResponse(
        access_token=token,
        expires_in=expires_in,
        username=auth.username,
    )


@router.get("/me")
def get_me(request: Request):
    """Return current authenticated user (requires valid token via middleware)."""
    username = getattr(request.state, "user", None)
    if not username:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"username": username}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config)],
):
    """Change the user's password. Writes new bcrypt hash to app.yaml."""
    if not app_config:
        raise HTTPException(status_code=400, detail="No configuration loaded")

    auth = app_config.auth

    # If no password is configured yet, require the request to be authenticated
    # (middleware ensures a valid JWT exists when auth.enabled=True).
    # Reject change-password when hash is empty to prevent takeover during
    # the initial setup window — use the Settings UI wizard instead.
    if not auth.password_hash:
        raise HTTPException(
            status_code=400,
            detail="No password configured. Use the setup wizard to set an initial password.",
        )
    if not _verify_password(body.current_password, auth.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    policy_error = _validate_policy(body.new_password, auth.policy)
    if policy_error:
        raise HTTPException(status_code=422, detail=policy_error)

    new_hash = _hash_password(body.new_password)
    _update_auth_config(app_config, {"password_hash": new_hash})
    return {"ok": True}


@router.post("/change-username")
def change_username(
    body: ChangeUsernameRequest,
    request: Request,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config)],
):
    """Change the username. Requires current password for verification."""
    if not app_config:
        raise HTTPException(status_code=400, detail="No configuration loaded")

    auth = app_config.auth

    if auth.password_hash and not _verify_password(body.password, auth.password_hash):
        raise HTTPException(status_code=401, detail="Password is incorrect")

    if not body.new_username.strip():
        raise HTTPException(status_code=422, detail="Username cannot be empty")

    _update_auth_config(app_config, {"username": body.new_username.strip()})
    return {"ok": True, "username": body.new_username.strip()}


# ── Internal helpers ──────────────────────────────────────────────────────────


def _update_auth_config(app_config: AppConfig, updates: dict) -> None:  # pragma: no cover
    """Patch auth section in app.yaml and reload global config."""
    import asyncio
    from rackscope.api.app import apply_config

    config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=500, detail="Config file not found")

    with open(config_path, "r") as f:
        raw = yaml.safe_load(f) or {}

    raw.setdefault("auth", {})
    raw["auth"].update(updates)

    with open(config_path, "w") as f:
        yaml.safe_dump(raw, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    # Reload config in background
    updated = app_config.model_copy(update={"auth": app_config.auth.model_copy(update=updates)})
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(apply_config(updated))
        else:
            loop.run_until_complete(apply_config(updated))
    except Exception:
        pass
