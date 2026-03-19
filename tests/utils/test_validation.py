"""
Tests for Validation Utils

Tests for input validation and sanitization functions.
"""

from rackscope.utils.validation import safe_segment


def test_safe_segment_normal_string():
    """Test sanitizing a normal string."""
    result = safe_segment("My Test Site", "default")
    assert result == "my-test-site"


def test_safe_segment_already_clean():
    """Test sanitizing an already clean string."""
    result = safe_segment("test-site-1", "default")
    assert result == "test-site-1"


def test_safe_segment_with_special_chars():
    """Test sanitizing string with special characters."""
    result = safe_segment("Test@Site#123!", "default")
    assert result == "test-site-123"


def test_safe_segment_with_underscores():
    """Test that underscores are preserved."""
    result = safe_segment("test_site_name", "default")
    assert result == "test_site_name"


def test_safe_segment_with_dots():
    """Test that dots are preserved."""
    result = safe_segment("test.site.1", "default")
    assert result == "test.site.1"


def test_safe_segment_with_hyphens():
    """Test that hyphens are preserved."""
    result = safe_segment("test-site-name", "default")
    assert result == "test-site-name"


def test_safe_segment_multiple_spaces():
    """Test sanitizing string with multiple spaces."""
    result = safe_segment("test   site   name", "default")
    assert result == "test-site-name"


def test_safe_segment_leading_trailing_spaces():
    """Test that leading/trailing spaces are stripped."""
    result = safe_segment("  test site  ", "default")
    assert result == "test-site"


def test_safe_segment_empty_string():
    """Test that empty string returns fallback."""
    result = safe_segment("", "fallback-value")
    assert result == "fallback-value"


def test_safe_segment_whitespace_only():
    """Test that whitespace-only string returns fallback."""
    result = safe_segment("   ", "fallback-value")
    assert result == "fallback-value"


def test_safe_segment_none_value():
    """Test that None value returns fallback."""
    result = safe_segment(None, "fallback-value")
    assert result == "fallback-value"


def test_safe_segment_uppercase():
    """Test that uppercase is converted to lowercase."""
    result = safe_segment("TEST SITE", "default")
    assert result == "test-site"


def test_safe_segment_mixed_case():
    """Test that mixed case is converted to lowercase."""
    result = safe_segment("Test Site Name", "default")
    assert result == "test-site-name"


def test_safe_segment_numbers():
    """Test that numbers are preserved."""
    result = safe_segment("site123", "default")
    assert result == "site123"


def test_safe_segment_numbers_and_letters():
    """Test sanitizing mix of numbers and letters."""
    result = safe_segment("test-site-123", "default")
    assert result == "test-site-123"


def test_safe_segment_leading_hyphens():
    """Test that leading hyphens are removed."""
    result = safe_segment("---test-site", "default")
    assert result == "test-site"


def test_safe_segment_trailing_hyphens():
    """Test that trailing hyphens are removed."""
    result = safe_segment("test-site---", "default")
    assert result == "test-site"


def test_safe_segment_only_special_chars():
    """Test that string with only special chars returns fallback."""
    result = safe_segment("@#$%^&*()", "fallback-value")
    assert result == "fallback-value"


def test_safe_segment_unicode_chars():
    """Test sanitizing string with unicode characters."""
    result = safe_segment("tést sïte", "default")
    assert result == "t-st-s-te"


def test_safe_segment_accented_chars():
    """Test sanitizing string with accented characters."""
    result = safe_segment("café résumé", "default")
    assert result == "caf-r-sum"


def test_safe_segment_slash():
    """Test that slashes are converted to hyphens."""
    result = safe_segment("test/site/name", "default")
    assert result == "test-site-name"


def test_safe_segment_consecutive_special_chars():
    """Test that consecutive special chars become single hyphen."""
    result = safe_segment("test@@##site", "default")
    assert result == "test-site"


def test_safe_segment_realistic_site_name():
    """Test realistic site name."""
    result = safe_segment("Datacenter North-1", "default")
    assert result == "datacenter-north-1"


def test_safe_segment_realistic_room_name():
    """Test realistic room name."""
    result = safe_segment("Server Room B2", "default")
    assert result == "server-room-b2"


def test_safe_segment_realistic_rack_name():
    """Test realistic rack name."""
    result = safe_segment("Rack-01-A", "default")
    assert result == "rack-01-a"


def test_safe_segment_with_parentheses():
    """Test sanitizing string with parentheses."""
    result = safe_segment("test (site) name", "default")
    assert result == "test-site-name"


def test_safe_segment_fallback_used():
    """Test that different fallbacks work correctly."""
    assert safe_segment("", "site") == "site"
    assert safe_segment("", "room") == "room"
    assert safe_segment("", "rack") == "rack"
    assert safe_segment("", "default-id") == "default-id"
