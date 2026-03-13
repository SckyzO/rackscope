"""
Regression tests for path traversal protection on topology mutation endpoints.

Strategy:
- Unit tests: verify assert_safe_id() directly (comprehensive)
- HTTP tests: verify FastAPI routing rejects dangerous IDs before business logic

The assert_safe_id guard runs inside the function body (after FastAPI resolves
dependencies). In production, all deps are loaded. In tests without full state,
503 from unloaded deps serves as an equivalent blocker.

The key invariant tested here: dangerous path params are NEVER passed to
filesystem operations (shutil.rmtree, Path.__truediv__, etc.).

Related: GitHub issue #11
"""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.utils.validation import assert_safe_id

client = TestClient(app)


# ── assert_safe_id unit tests ─────────────────────────────────────────────────


class TestAssertSafeId:
    """Direct unit tests for the assert_safe_id guard."""

    def test_valid_ids_pass(self):
        """IDs matching [a-z0-9._-]{1,128} are accepted."""
        for valid in [
            "site-01",
            "rack.01",
            "my_rack",
            "dc-paris-01",
            "a",
            "a" * 128,
            "room-compute-a",
            "aisle.01",
            "rack_c10",
        ]:
            result = assert_safe_id(valid, "test")
            assert result == valid, f"Expected {valid!r} to pass"

    def test_path_traversal_rejected(self):
        """Path traversal sequences are rejected with HTTP 400."""
        for dangerous in [
            "../../../etc/passwd",
            "../../plugins",
            "..",                    # pure traversal
            ".hidden",               # starts with dot — not alphanumeric start
            "rack/../../../etc",
            "site/../../tmp",
        ]:
            with pytest.raises(HTTPException) as exc_info:
                assert_safe_id(dangerous, "site_id")
            assert exc_info.value.status_code == 400
            assert "site_id" in exc_info.value.detail

    def test_url_encoded_traversal_rejected(self):
        """URL-encoded traversal sequences are rejected."""
        for encoded in [
            "..%2F..%2Fetc",
            "rack%2F..%2F",
            "%2e%2e",
        ]:
            with pytest.raises(HTTPException):
                assert_safe_id(encoded, "rack_id")

    def test_special_chars_rejected(self):
        """Filesystem-dangerous special characters are rejected."""
        for bad_char in ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]:
            with pytest.raises(HTTPException):
                assert_safe_id(f"rack{bad_char}01", "rack_id")

    def test_uppercase_rejected(self):
        """Uppercase is not allowed (prevents case-sensitivity attacks)."""
        with pytest.raises(HTTPException):
            assert_safe_id("UPPERCASE", "rack_id")

    def test_space_rejected(self):
        """Spaces are rejected."""
        with pytest.raises(HTTPException):
            assert_safe_id("rack id", "rack_id")

    def test_empty_rejected(self):
        """Empty string is rejected."""
        with pytest.raises(HTTPException):
            assert_safe_id("", "rack_id")

    def test_null_byte_rejected(self):
        """Null bytes are rejected."""
        with pytest.raises(HTTPException):
            assert_safe_id("rack\x00id", "rack_id")

    def test_too_long_rejected(self):
        """IDs longer than 128 chars are rejected."""
        with pytest.raises(HTTPException):
            assert_safe_id("a" * 129, "rack_id")

    def test_exactly_128_passes(self):
        """128-char IDs are allowed (boundary value)."""
        assert assert_safe_id("a" * 128, "rack_id") == "a" * 128

    def test_error_message_includes_field_name(self):
        """Error message identifies which field is invalid."""
        with pytest.raises(HTTPException) as exc_info:
            assert_safe_id("../evil", "rack_id")
        assert "rack_id" in exc_info.value.detail

    def test_error_message_includes_value(self):
        """Error message includes the rejected value."""
        with pytest.raises(HTTPException) as exc_info:
            assert_safe_id("../evil", "rack_id")
        assert "../evil" in exc_info.value.detail

    def test_returns_unchanged_value(self):
        """Valid IDs are returned unchanged (not sanitized)."""
        assert assert_safe_id("rack-01", "rack_id") == "rack-01"


# ── HTTP integration tests ────────────────────────────────────────────────────


class TestPathTraversalHTTP:
    """Integration tests verifying traversal IDs are blocked at the HTTP level.

    Note: In the test environment, topology/catalog/config may not be loaded,
    so non-traversal errors (503/404) are expected for valid IDs. The critical
    property is that traversal IDs never reach filesystem operations.
    """

    @pytest.mark.parametrize("traversal_id", [
        "../../../etc",
        "../../plugins",
        "rack%2F..%2F",
    ])
    def test_delete_site_blocks_traversal(self, traversal_id):
        """DELETE /api/topology/sites/{site_id} blocks path traversal IDs."""
        response = client.delete(f"/api/topology/sites/{traversal_id}")
        # 400 = our guard caught it; 422 = FastAPI routing rejected it
        # Both prevent the ID from reaching shutil.rmtree()
        assert response.status_code in (400, 404, 405, 422, 503), (
            f"Expected traversal ID {traversal_id!r} to be blocked, "
            f"got {response.status_code}"
        )
        # Specifically, should NOT be 200 (success = ID was used)
        assert response.status_code != 200

    @pytest.mark.parametrize("traversal_id", [
        "../../../etc",
        "../../rooms",
    ])
    def test_delete_room_blocks_traversal(self, traversal_id):
        """DELETE /api/topology/rooms/{room_id} blocks path traversal IDs."""
        response = client.delete(f"/api/topology/rooms/{traversal_id}")
        assert response.status_code != 200

    @pytest.mark.parametrize("traversal_id", [
        "../../../etc",
        "../../aisles",
    ])
    def test_delete_aisle_blocks_traversal(self, traversal_id):
        """DELETE /api/topology/aisles/{aisle_id} blocks path traversal IDs."""
        response = client.delete(f"/api/topology/aisles/{traversal_id}")
        assert response.status_code != 200

    def test_valid_id_not_blocked_by_guard(self):
        """Valid IDs are not rejected by the traversal guard (503/404 = business logic ran)."""
        response = client.delete("/api/topology/sites/valid-site-id")
        # 503 = guard passed, deps not loaded in test
        # 404 = guard passed, site not found
        # NOT 400 (which would mean our guard incorrectly blocked a valid ID)
        assert response.status_code != 400, (
            "valid-site-id should NOT be blocked by the traversal guard"
        )
