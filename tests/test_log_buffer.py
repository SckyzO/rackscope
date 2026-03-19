"""Tests for LogBuffer — ring buffer, filtering, sequence tracking."""

from rackscope.api.log_buffer import LogBuffer, _redact


# ── _redact ───────────────────────────────────────────────────────────────────


def test_redact_url_credentials():
    """URL-embedded credentials are redacted."""
    text = "Connecting to http://user:s3cr3t@host:5432/db"
    result = _redact(text)
    assert "s3cr3t" not in result
    assert "user:***@" in result


def test_redact_key_value_pattern():
    """password=... patterns are redacted."""
    result = _redact("config: password=mysecret host=localhost")
    assert "mysecret" not in result
    assert "***" in result


def test_redact_no_sensitive_data():
    """Non-sensitive text passes through unchanged."""
    text = "Starting server on port 8000"
    assert _redact(text) == text


# ── LogBuffer.recent ──────────────────────────────────────────────────────────


def _make_buffer(*messages: str, base_seq: int = 1) -> LogBuffer:
    buf = LogBuffer()
    for i, msg in enumerate(messages):
        buf.add({"_seq": base_seq + i, "level": "INFO", "message": msg, "logger": "test"})
    return buf


def test_recent_returns_all_by_default():
    buf = _make_buffer("a", "b", "c")
    assert len(buf.recent()) == 3


def test_recent_since_seq_filters_older():
    """since_seq > 0 returns only records with _seq greater than that value."""
    buf = _make_buffer("first", "second", "third", base_seq=10)
    result = buf.recent(since_seq=11)
    assert len(result) == 1
    assert result[0]["message"] == "third"


def test_recent_level_filter():
    """level filter keeps only matching records."""
    buf = LogBuffer()
    buf.add({"_seq": 1, "level": "INFO", "message": "info msg", "logger": "t"})
    buf.add({"_seq": 2, "level": "ERROR", "message": "error msg", "logger": "t"})
    buf.add({"_seq": 3, "level": "INFO", "message": "info 2", "logger": "t"})

    result = buf.recent(level="error")
    assert len(result) == 1
    assert result[0]["message"] == "error msg"


def test_recent_search_filter_message():
    """search filter matches against message content (case-insensitive)."""
    buf = _make_buffer("hello world", "foo bar", "Hello RACKSCOPE")
    result = buf.recent(search="hello")
    assert len(result) == 2


def test_recent_search_filter_logger():
    """search filter also matches against logger name."""
    buf = LogBuffer()
    buf.add({"_seq": 1, "level": "INFO", "message": "msg", "logger": "rackscope.telemetry"})
    buf.add({"_seq": 2, "level": "INFO", "message": "msg", "logger": "rackscope.api"})

    result = buf.recent(search="telemetry")
    assert len(result) == 1
    assert "telemetry" in result[0]["logger"]


def test_recent_n_limit():
    """n parameter caps the number of returned records."""
    buf = _make_buffer("a", "b", "c", "d", "e")
    result = buf.recent(n=2)
    assert len(result) == 2
    # Returns the newest (last) records
    assert result[-1]["message"] == "e"


# ── LogBuffer.clear ───────────────────────────────────────────────────────────


def test_clear_empties_buffer():
    buf = _make_buffer("x", "y", "z")
    assert len(buf.recent()) == 3
    buf.clear()
    assert len(buf.recent()) == 0


# ── LogBuffer.last_seq ────────────────────────────────────────────────────────


def test_last_seq_empty_returns_zero():
    buf = LogBuffer()
    assert buf.last_seq() == 0


def test_last_seq_returns_last_record_seq():
    buf = _make_buffer("a", "b", "c", base_seq=5)
    assert buf.last_seq() == 7
