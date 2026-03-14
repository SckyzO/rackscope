---
id: logs
title: Backend Logs
sidebar_position: 9
---

# Backend Logs

The **Logs** page streams real-time application logs from the Rackscope backend directly in the Web UI, without needing SSH or `docker logs`.

## Accessing Logs

Navigate to **Logs** in the bottom of the sidebar, or go to `/logs`.

The link is visible by default. To hide it (kiosk or public deployments):

```yaml
# config/app.yaml
features:
  show_logs: false
```

Or toggle it in **Settings → Views → Pages & Navigation → Backend Logs**.

---

## Interface

### Live mode vs Paused mode

| Mode | Behaviour |
|---|---|
| **Live** (default) | Connects via SSE — new log lines appear in real time (~0.5 s latency). Green pulsing dot in the button. |
| **Paused** | Disconnects SSE. Shows a snapshot. Use **Refresh** to manually reload. |

Click the **Live / Paused** button in the page header to toggle.

### Filters

| Control | Description |
|---|---|
| **Level pills** | Filter by `ALL`, `DEBUG`, `INFO`, `WARNING`, `ERROR`. |
| **Search bar** | Case-insensitive substring match on `message` and `logger` name. |
| **Entry count** | Shows the number of lines currently displayed. |

### Reverse order

The **↕** icon button toggles between:
- **Oldest first** (default) — chronological, auto-scroll follows the bottom
- **Newest first** — most recent entry at the top, auto-scroll follows the top

Auto-scroll is disabled when you scroll away from the tracked edge and re-enables when you scroll back.

### Actions

| Button | Action |
|---|---|
| **Live / Paused** | Toggle SSE stream |
| **Refresh** *(paused only)* | Reload snapshot |
| **↕** | Toggle reverse order |
| **↓ Export** | Download current buffer as `rackscope-logs-<timestamp>.json` |
| **Clear** | Empty the server-side buffer immediately |

### Row detail

Click any log row that has an exception or a `request_id` to expand it:
- `request_id` — correlates with the `X-Request-ID` response header
- Exception — full Python traceback, pre-formatted

---

## Technical details

### In-memory ring buffer

Logs are kept in a **1 000-entry ring buffer** in RAM. The buffer is:
- Never persisted to disk
- Cleared when the backend container restarts
- Cleared via the **Clear** button or `DELETE /api/logs`

For persistent log storage, mount a volume and redirect stdout to a file, or use a log aggregator (Loki, Elastic, etc.).

### Sensitive field redaction

Secrets are stripped **at capture time**, before entering the buffer:

| Pattern | Redacted to |
|---|---|
| URL credentials `http://user:secret@host` | `http://user:***@host` |
| `password=…`, `token=…`, `secret_key=…`, etc. | `password=***` |

### SSE stream limits

| Parameter | Value |
|---|---|
| Max concurrent streams | 5 |
| Auto-disconnect after | 10 minutes |
| Heartbeat interval | 30 seconds |
| Poll interval | 0.5 seconds |

### API endpoints

All endpoints require admin access (`require_admin` dependency — see [Admin Endpoint Protection](./settings-ui#admin-endpoint-protection)).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/logs` | Recent entries. Params: `n` (max 1000), `level`, `search`, `since_seq` |
| `GET` | `/api/logs/stream` | SSE stream. Params: `level`, `search` |
| `DELETE` | `/api/logs` | Clear the buffer |

---

## Log levels reference

| Level | Colour | Meaning |
|---|---|---|
| `DEBUG` | Gray | Verbose internal state — disabled by default |
| `INFO` | Blue | Normal operations: requests, topology reload, cache hits |
| `WARNING` | Amber | Non-critical issues: missed cache, slow query, retried request |
| `ERROR` | Red | Failures requiring attention: Prometheus unreachable, YAML parse error |
| `CRITICAL` | Red bold | Fatal errors — backend may be in a degraded state |

Default log level is `INFO`. Change it with the environment variable:

```bash
RACKSCOPE_LOG_LEVEL=DEBUG
```
