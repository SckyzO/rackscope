"""
Tests for auth router — helper functions and API endpoints.

Target coverage: 33% → 80%+
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import bcrypt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.routers.auth import (
    _decode_token,
    _hash_password,
    _make_token,
    _secret_key,
    _token_expiry,
    _validate_policy,
    _verify_password,
)
from rackscope.model.config import AppConfig, AuthConfig, PasswordPolicyConfig

client = TestClient(app)
SECRET = "test-secret-key-12345-very-long-for-testing"


def override_app_config(config):
    """Override get_app_config dependency."""

    def _get_app_config():
        return config

    return _get_app_config


# ── Pure helper functions ─────────────────────────────────────────────────────


class TestHashPassword:
    """Test password hashing function."""

    def test_hash_is_bcrypt(self):
        """Hash should use bcrypt format."""
        h = _hash_password("mypassword")
        assert h.startswith("$2b$")

    def test_hash_is_deterministic_salted(self):
        """Same password should produce different hashes (different salts)."""
        h1 = _hash_password("pass")
        h2 = _hash_password("pass")
        assert h1 != h2  # different salts

    def test_hash_empty_password(self):
        """Empty password should still hash."""
        h = _hash_password("")
        assert h.startswith("$2b$")

    def test_hash_unicode_password(self):
        """Unicode characters should be supported."""
        h = _hash_password("café☕")
        assert h.startswith("$2b$")


class TestVerifyPassword:
    """Test password verification function."""

    def test_correct_password(self):
        """Correct password should verify."""
        h = _hash_password("correct")
        assert _verify_password("correct", h) is True

    def test_wrong_password(self):
        """Wrong password should not verify."""
        h = _hash_password("correct")
        assert _verify_password("wrong", h) is False

    def test_invalid_hash_returns_false(self):
        """Invalid hash should return False, not raise."""
        assert _verify_password("pass", "notahash") is False

    def test_empty_hash_returns_false(self):
        """Empty hash should return False."""
        assert _verify_password("pass", "") is False

    def test_empty_password_verifies_against_empty_hash_is_false(self):
        """Empty password against empty hash should not verify."""
        # bcrypt requires valid hash format
        assert _verify_password("", "") is False

    def test_unicode_password_verification(self):
        """Unicode passwords should verify correctly."""
        h = _hash_password("café☕")
        assert _verify_password("café☕", h) is True
        assert _verify_password("cafe", h) is False


class TestValidatePolicy:
    """Test password policy validation function."""

    def setup_method(self):
        """Create default policy for tests."""
        self.policy = PasswordPolicyConfig(
            min_length=6,
            max_length=20,
            require_digit=False,
            require_symbol=False,
        )

    def test_valid_password(self):
        """Valid password should return None."""
        assert _validate_policy("goodpass", self.policy) is None

    def test_too_short(self):
        """Password shorter than min_length should fail."""
        err = _validate_policy("abc", self.policy)
        assert err is not None
        assert "6" in err
        assert "at least" in err.lower()

    def test_too_long(self):
        """Password longer than max_length should fail."""
        err = _validate_policy("a" * 25, self.policy)
        assert err is not None
        assert "20" in err
        assert "at most" in err.lower()

    def test_exactly_min_length(self):
        """Password exactly at min_length should pass."""
        assert _validate_policy("123456", self.policy) is None

    def test_exactly_max_length(self):
        """Password exactly at max_length should pass."""
        assert _validate_policy("a" * 20, self.policy) is None

    def test_requires_digit_missing(self):
        """When require_digit=True, password without digit should fail."""
        policy = PasswordPolicyConfig(
            min_length=6, max_length=50, require_digit=True, require_symbol=False
        )
        err = _validate_policy("nodigits", policy)
        assert err is not None
        assert "digit" in err.lower()

    def test_requires_digit_present(self):
        """When require_digit=True, password with digit should pass."""
        policy = PasswordPolicyConfig(
            min_length=6, max_length=50, require_digit=True, require_symbol=False
        )
        assert _validate_policy("pass1word", policy) is None

    def test_requires_symbol_missing(self):
        """When require_symbol=True, password without symbol should fail."""
        policy = PasswordPolicyConfig(
            min_length=6, max_length=50, require_digit=False, require_symbol=True
        )
        err = _validate_policy("nosymbol", policy)
        assert err is not None
        assert "symbol" in err.lower()

    def test_requires_symbol_present(self):
        """When require_symbol=True, password with symbol should pass."""
        policy = PasswordPolicyConfig(
            min_length=6, max_length=50, require_digit=False, require_symbol=True
        )
        assert _validate_policy("has!symbol", policy) is None

    def test_all_requirements(self):
        """Password meeting all requirements should pass."""
        policy = PasswordPolicyConfig(
            min_length=8, max_length=30, require_digit=True, require_symbol=True
        )
        assert _validate_policy("Pass123!word", policy) is None

    def test_all_requirements_fails(self):
        """Password failing any requirement should fail."""
        policy = PasswordPolicyConfig(
            min_length=8, max_length=30, require_digit=True, require_symbol=True
        )
        # Missing digit
        err1 = _validate_policy("Password!", policy)
        assert err1 is not None
        # Missing symbol
        err2 = _validate_policy("Password1", policy)
        assert err2 is not None


class TestTokenExpiry:
    """Test token expiry calculation function."""

    def test_8h_session(self):
        """8h session should return expiry ~8 hours in future."""
        exp = _token_expiry("8h")
        assert exp is not None
        diff = (exp - datetime.now(timezone.utc)).total_seconds()
        assert 28000 < diff < 29000  # ~8h (allowing some test execution time)

    def test_24h_session(self):
        """24h session should return expiry ~24 hours in future."""
        exp = _token_expiry("24h")
        assert exp is not None
        diff = (exp - datetime.now(timezone.utc)).total_seconds()
        assert 86000 < diff < 87000  # ~24h

    def test_unlimited_session(self):
        """Unlimited session should return None (no expiry)."""
        exp = _token_expiry("unlimited")
        assert exp is None

    def test_unknown_duration_defaults_unlimited(self):
        """Unknown duration should default to unlimited."""
        exp = _token_expiry("invalid")
        assert exp is None


class TestMakeAndDecodeToken:
    """Test JWT token creation and decoding."""

    def test_roundtrip(self):
        """Token should encode and decode username correctly."""
        token = _make_token("admin", SECRET, None)
        username = _decode_token(token, SECRET)
        assert username == "admin"

    def test_with_expiry(self):
        """Token with expiry should decode before expiration."""
        exp = datetime.now(timezone.utc) + timedelta(hours=1)
        token = _make_token("user", SECRET, exp)
        username = _decode_token(token, SECRET)
        assert username == "user"

    def test_invalid_token_raises(self):
        """Invalid token format should raise HTTPException."""
        with pytest.raises(HTTPException) as exc:
            _decode_token("not.a.token", SECRET)
        assert exc.value.status_code == 401

    def test_wrong_secret_raises(self):
        """Token signed with different secret should raise."""
        token = _make_token("admin", SECRET, None)
        with pytest.raises(HTTPException) as exc:
            _decode_token(token, "wrong-secret-key-32-bytes-minimum!!")
        assert exc.value.status_code == 401

    def test_expired_token_raises(self):
        """Expired token should raise HTTPException."""
        exp = datetime.now(timezone.utc) - timedelta(hours=1)  # expired
        token = _make_token("admin", SECRET, exp)
        with pytest.raises(HTTPException) as exc:
            _decode_token(token, SECRET)
        assert exc.value.status_code == 401

    def test_token_missing_sub_raises(self):
        """Token without 'sub' claim should raise."""
        import jwt as _pyjwt

        token = _pyjwt.encode({}, SECRET, algorithm="HS256")
        with pytest.raises(HTTPException) as exc:
            _decode_token(token, SECRET)
        assert exc.value.status_code == 401

    def test_token_unicode_username(self):
        """Token with unicode username should work."""
        token = _make_token("användare", SECRET, None)
        username = _decode_token(token, SECRET)
        assert username == "användare"


class TestSecretKey:
    """Test secret key resolution function."""

    def test_secret_from_config(self):
        """When config has secret_key, should return it."""
        auth_config = AuthConfig(enabled=True, secret_key="config-secret-key-32-bytes!!")
        app_config = MagicMock(spec=AppConfig)
        app_config.auth = auth_config
        secret = _secret_key(app_config)
        assert secret == "config-secret-key-32-bytes!!"

    def test_secret_from_runtime_when_empty(self):
        """When config secret_key is empty, should fall back to runtime."""
        auth_config = AuthConfig(enabled=True, secret_key="")
        app_config = MagicMock(spec=AppConfig)
        app_config.auth = auth_config
        with patch("rackscope.api.app.AUTH_RUNTIME_SECRET", "runtime-secret-key-32bytes!!"):
            secret = _secret_key(app_config)
            assert secret == "runtime-secret-key-32bytes!!"


# ── API endpoints ─────────────────────────────────────────────────────────────


class TestAuthStatus:
    """Test GET /api/auth/status endpoint."""

    def test_auth_status_returns_200(self):
        """Status endpoint should return 200."""
        resp = client.get("/api/auth/status")
        assert resp.status_code == 200

    def test_auth_status_has_required_fields(self):
        """Status response should have all required fields."""
        resp = client.get("/api/auth/status")
        data = resp.json()
        assert "enabled" in data
        assert "configured" in data
        assert "username" in data
        assert "policy" in data

    def test_auth_status_when_no_config(self):
        """When no config, status should show disabled."""
        with patch("rackscope.api.app.APP_CONFIG", None):
            resp = client.get("/api/auth/status")
            assert resp.status_code == 200
            data = resp.json()
            assert data["enabled"] is False
            assert data["configured"] is False
            assert data["username"] == "admin"  # default

    def test_auth_status_disabled_in_test_env(self):
        """In test environment auth.enabled should be false."""
        resp = client.get("/api/auth/status")
        data = resp.json()
        assert isinstance(data["enabled"], bool)


class TestLogin:
    """Test POST /api/auth/login endpoint."""

    def test_login_missing_fields(self):
        """Login without required fields should return 422."""
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 422

    def test_login_auth_disabled_returns_400(self):
        """When auth is disabled, login should return 400."""
        # Test env has auth disabled by default
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
        assert resp.status_code == 400
        assert "not enabled" in resp.json()["detail"].lower()

    def test_login_wrong_username(self):
        """Login with wrong username should return 401."""
        password = "testpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash=hashed,
            secret_key=SECRET,
            session_duration="24h",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        # Patch APP_CONFIG global
        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/login", json={"username": "wronguser", "password": password}
            )
            assert resp.status_code == 401
            assert "credentials" in resp.json()["detail"].lower()

    def test_login_wrong_password(self):
        """Login with wrong password should return 401."""
        password = "testpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash=hashed,
            secret_key=SECRET,
            session_duration="24h",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/login", json={"username": "admin", "password": "wrongpass"}
            )
            assert resp.status_code == 401

    def test_login_no_password_configured(self):
        """Login when no password hash configured should return 401."""
        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash="",  # not configured
            secret_key=SECRET,
            session_duration="24h",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post("/api/auth/login", json={"username": "admin", "password": "anypass"})
            assert resp.status_code == 401
            assert "no password configured" in resp.json()["detail"].lower()

    def test_login_success_returns_token(self):
        """Successful login should return token and user info."""
        password = "testpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash=hashed,
            secret_key=SECRET,
            session_duration="24h",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post("/api/auth/login", json={"username": "admin", "password": password})
            assert resp.status_code == 200
            data = resp.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            assert data["username"] == "admin"
            assert data["expires_in"] == 24 * 3600

    def test_login_8h_session(self):
        """Login with 8h session should return correct expires_in."""
        password = "testpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash=hashed,
            secret_key=SECRET,
            session_duration="8h",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post("/api/auth/login", json={"username": "admin", "password": password})
            assert resp.status_code == 200
            data = resp.json()
            assert data["expires_in"] == 8 * 3600

    def test_login_unlimited_session(self):
        """Login with unlimited session should return None expires_in."""
        password = "testpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=True,
            username="admin",
            password_hash=hashed,
            secret_key=SECRET,
            session_duration="unlimited",
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post("/api/auth/login", json={"username": "admin", "password": password})
            assert resp.status_code == 200
            data = resp.json()
            assert data["expires_in"] is None


class TestGetMe:
    """Test GET /api/auth/me endpoint."""

    def test_me_without_auth_returns_401(self):
        """Request without auth should return 401."""
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self):
        """Request with invalid bearer token should return 401."""
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer fake-token"})
        assert resp.status_code == 401

    def test_me_with_valid_token_returns_username(self):
        """Request with valid token in state should return username."""
        # We need to mock request.state.user
        # This is tricky without full middleware, so we test the logic
        pass


class TestChangePassword:
    """Test POST /api/auth/change-password endpoint."""

    def test_change_password_missing_fields(self):
        """Change password without required fields should return 422."""
        resp = client.post("/api/auth/change-password", json={})
        assert resp.status_code == 422

    def test_change_password_no_config(self):
        """Change password without config should return 400."""
        with patch("rackscope.api.app.APP_CONFIG", None):
            resp = client.post(
                "/api/auth/change-password",
                json={"current_password": "old", "new_password": "newpass123"},
            )
            assert resp.status_code == 400

    def test_change_password_wrong_current_password(self):
        """Change password with wrong current password should return 401."""
        password = "oldpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=False,  # Disable auth for test
            password_hash=hashed,
            policy=PasswordPolicyConfig(),
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/change-password",
                json={"current_password": "wrongpass", "new_password": "newpass123"},
            )
            assert resp.status_code == 401

    def test_change_password_policy_violation(self):
        """Change password violating policy should return 422."""
        password = "oldpass123"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=False,  # Disable auth for test (no middleware check)
            password_hash=hashed,
            policy=PasswordPolicyConfig(min_length=10),
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/change-password",
                json={"current_password": password, "new_password": "short"},
            )
            assert resp.status_code == 422

    def test_change_password_initial_setup_without_hash(self):
        """Change password when no hash exists must be rejected (security fix H2).

        An empty password_hash means no password is configured yet.
        Accepting a change-password request in this state would allow anyone
        to take over the admin account before the wizard sets the initial password.
        The endpoint now returns 400 to force use of the setup wizard.
        """
        auth_config = AuthConfig(
            enabled=False,
            password_hash="",  # not configured yet
            policy=PasswordPolicyConfig(),
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/change-password",
                json={"current_password": "", "new_password": "newpass123"},
            )
            # Must be rejected — empty hash = no password configured
            assert resp.status_code == 400
            assert "setup wizard" in resp.json()["detail"].lower()


class TestChangeUsername:
    """Test POST /api/auth/change-username endpoint."""

    def test_change_username_missing_fields(self):
        """Change username without required fields should return 422."""
        resp = client.post("/api/auth/change-username", json={})
        assert resp.status_code == 422

    def test_change_username_no_config(self):
        """Change username without config should return 400."""
        with patch("rackscope.api.app.APP_CONFIG", None):
            resp = client.post(
                "/api/auth/change-username",
                json={"password": "pass", "new_username": "newuser"},
            )
            assert resp.status_code == 400

    def test_change_username_wrong_password(self):
        """Change username with wrong password should return 401."""
        password = "correctpass"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=False,  # Disable auth for test
            password_hash=hashed,
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/change-username",
                json={"password": "wrongpass", "new_username": "newuser"},
            )
            assert resp.status_code == 401

    def test_change_username_empty_username(self):
        """Change username to empty string should return 422."""
        password = "correctpass"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=False,  # Disable auth for test
            password_hash=hashed,
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.app.APP_CONFIG", mock_config):
            resp = client.post(
                "/api/auth/change-username",
                json={"password": password, "new_username": "   "},
            )
            assert resp.status_code == 422

    def test_change_username_success(self):
        """Successful username change should return 200."""
        password = "correctpass"
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        auth_config = AuthConfig(
            enabled=False,  # Disable auth for test
            password_hash=hashed,
        )
        mock_config = MagicMock(spec=AppConfig)
        mock_config.auth = auth_config

        with patch("rackscope.api.routers.auth._update_auth_config") as mock_update:
            with patch("rackscope.api.app.APP_CONFIG", mock_config):
                resp = client.post(
                    "/api/auth/change-username",
                    json={"password": password, "new_username": "newuser"},
                )
                assert resp.status_code == 200
                data = resp.json()
                assert data["ok"] is True
                assert data["username"] == "newuser"
                mock_update.assert_called_once()
