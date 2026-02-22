"""
Auth Router

Endpoints for authentication: login, session info, credential management.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

import yaml
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError

from rackscope.model.config import AppConfig

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    return jwt.encode(payload, secret, algorithm="HS256")


def _decode_token(token: str, secret: str) -> str:
    """Decode token and return username. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
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
    )


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config)],
):
    """Validate credentials and return a JWT."""
    if not app_config or not app_config.auth.enabled:
        raise HTTPException(status_code=400, detail="Authentication is not enabled")

    auth = app_config.auth
    # Username check
    if body.username != auth.username:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Password check — empty hash means not yet configured
    if not auth.password_hash:
        raise HTTPException(status_code=401, detail="No password configured")

    if not pwd_ctx.verify(body.password, auth.password_hash):
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

    # Allow initial password setup even when no hash exists yet
    if auth.password_hash and not pwd_ctx.verify(body.current_password, auth.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")

    new_hash = pwd_ctx.hash(body.new_password)
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

    if auth.password_hash and not pwd_ctx.verify(body.password, auth.password_hash):
        raise HTTPException(status_code=401, detail="Password is incorrect")

    if not body.new_username.strip():
        raise HTTPException(status_code=422, detail="Username cannot be empty")

    _update_auth_config(app_config, {"username": body.new_username.strip()})
    return {"ok": True, "username": body.new_username.strip()}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _update_auth_config(app_config: AppConfig, updates: dict) -> None:
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
    updated = app_config.model_copy(
        update={"auth": app_config.auth.model_copy(update=updates)}
    )
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(apply_config(updated))
        else:
            loop.run_until_complete(apply_config(updated))
    except Exception:
        pass  # Config will reload on next startup if async fails
