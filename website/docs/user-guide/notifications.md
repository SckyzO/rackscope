---
id: notifications
title: Notifications
sidebar_position: 10
---

# Notifications

Rackscope provides real-time alerts and notifications about your infrastructure health.

![Notifications page](/img/screenshots/notifications.png)

## Types of Notifications

Rackscope generates two categories of notifications:

**Health Alerts** — triggered when a node, chassis, or rack transitions to WARN or CRIT state based on a configured health check. These are the primary operational signals: a node going down, a temperature crossing a threshold, a PDU approaching its current limit.

**System Events** — informational messages about Rackscope itself: configuration reloads, simulator scenario changes, plugin enable/disable, backend connectivity issues. System events are displayed at INFO severity and do not increment the alert badge count.

Both types appear in the notification panel and on the full Notifications page. Health alerts also trigger toast popups if `features.notifications` is enabled.

## Notification Bell

The bell icon in the top-right header is the primary entry point for notifications:

- **Badge count** — a red badge appears on the bell showing the number of unread WARN and CRIT health alerts. System events do not count toward the badge.
- **Click to open** — clicking the bell opens a dropdown panel showing the most recent notifications.
- **Dropdown panel** — shows up to `notifications_max_visible` entries (default: 10), sorted newest first. Each entry shows severity, node ID, rack location, and a short description.
- **Mark all read** — a "Mark all as read" button in the dropdown panel clears the badge count without dismissing the entries.
- **View all** — a link at the bottom of the dropdown navigates to the full Notifications page.

## Alert Feed (Full Notifications Page)

The full Notifications page is available at `/notifications`. It provides the complete history of alerts and events with filtering and sorting controls.

### Filtering

Use the filter bar at the top of the page to narrow the list:

| Filter | Options |
|--------|---------|
| **Severity** | All, CRIT only, WARN only, INFO only |
| **Type** | All, Health alerts, System events |
| **Site** | All sites, or a specific site ID |
| **Time range** | Last hour, Last 6 hours, Last 24 hours, All |

Filters are applied client-side and update the list immediately without a server request.

### Sorting

Click any column header to sort by that column. Default sort is **severity descending, then timestamp descending** (most severe and most recent first).

Available sort columns: Severity, Timestamp, Node, Rack, Check.

### Alert Details

Each row in the alert feed can be expanded by clicking it. The expanded view shows:

- **Node ID** — the Prometheus instance identifier (e.g., `compute001`)
- **Rack location** — site / room / rack path (e.g., `dc1 / room-a / rack-03`)
- **Check that triggered** — the check ID and human-readable name (e.g., `ipmi_temp_warn — IPMI Temperature Warning`)
- **Severity** — WARN or CRIT
- **Current value** — the raw metric value that triggered the rule (e.g., `87.5` for a temperature check)
- **Threshold** — the configured threshold (e.g., `>= 85`)
- **First seen** — timestamp when the alert first appeared
- **Last seen** — timestamp of the most recent evaluation that returned this state

Click **View Device** in the expanded row to navigate directly to the [Device View](/user-guide/views#device-view) for that node.

## Enabling and Disabling Notifications

The notification system is controlled by the `features.notifications` key in `config/app.yaml`:

```yaml
features:
  notifications: true
```

When set to `false`:

- The bell icon is hidden from the header.
- Toast popups are suppressed.
- The `/notifications` page still renders but shows no entries.
- Health alerts are still evaluated by the backend — only the UI presentation is disabled.

You can also toggle notifications from **Settings** (`/settings`) → **Features** → **Notifications**.

## Toast Notifications

Toast notifications are ephemeral popups that appear in the bottom-right corner of the screen when a new WARN or CRIT alert is detected during a polling cycle.

Each toast shows:

- Severity badge (WARN or CRIT)
- Node ID and rack location
- Check name that triggered the alert (human-readable)
- **→ Rack name link** — click to navigate directly to the rack view and dismiss the toast

**Duration**: Toasts auto-dismiss after `toast_duration_seconds` (default: 5 seconds). Set to `0` to disable auto-dismiss — the user must close them manually.

```yaml
features:
  notifications: true
  toast_duration_seconds: 5
```

Multiple toasts stack vertically with a semi-transparent background (more opaque on dark mode). Hovering a toast makes it fully opaque.

When multiple alerts are stacked, click the **N alerts ↓** button to expand the full list — each item animates in with a staggered slide-up effect. Click the collapse button to return to the stacked view.

:::note
Toasts are only shown for **new** alerts detected since the last polling cycle. If you reload the page, previously active alerts do not re-trigger toasts — they appear only in the alert feed.
:::

## Maximum Visible Notifications

The `notifications_max_visible` setting controls how many entries are shown in the notification bell dropdown panel (not the full page):

```yaml
features:
  notifications: true
  notifications_max_visible: 10
```

The default is **10**. The full Notifications page always shows the complete history regardless of this setting.

## Clearing Notifications

There are three ways to manage notifications:

**Mark as read** — click the bell icon and then **Mark all as read**. This clears the badge counter and marks all current notifications as read. The entries remain visible in the dropdown and on the full page.

**Dismiss individual** — hover over an entry in the bell dropdown and click the X button to remove it from the dropdown. Dismissed entries are still visible on the full Notifications page.

**Clear all** — on the full Notifications page (`/notifications`), use the **Clear All** button in the top-right corner. This removes all entries from both the dropdown and the full page. This action cannot be undone.

Notification state (read/unread, dismissed entries) is stored in the browser's `localStorage` under `rackscope.notifications`. It is per-browser and not synchronized across sessions or users.
