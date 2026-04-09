# Maintenance Windows

Maintenance windows let you silence or tag alerts on specific infrastructure targets
during planned work — without touching Prometheus or Alertmanager.

## Overview

When a rack, device, room or site is under maintenance, Rackscope can either:

- **Badge** — alerts remain visible but are tagged with a `maintenance` label.
  Use this when you want the NOC to know work is in progress.
- **Hide** — alerts are suppressed entirely and do not appear in the active alerts list.
  Use this for planned downtime where noise would be distracting.

Maintenance propagates down the hierarchy: a rack-level maintenance automatically
covers all devices inside that rack.

## Managing Maintenances

Navigate to **Maintenances** in the sidebar (Settings → Views → Maintenances must be enabled).

### Creating a maintenance

1. Click **New Maintenance** (top right).
2. Fill in the form:
   - **Target Type** — `site`, `room`, `rack`, or `device`
   - **Target ID** — the exact ID from your topology (e.g. `rack-01`, `node-42`)
   - **Reason** — free-text description shown in the alert detail
   - **Effect** — `badge` (visible, tagged) or `hide` (suppressed)
   - **Expires At** — optional datetime; leave blank for a manual maintenance with no automatic expiry
3. Click **Create**.

The maintenance becomes **ACTIVE** immediately (or **SCHEDULED** if `starts_at` is in the future).

### Editing a maintenance

Click **Edit** on any row to update the reason, effect, or expiry date.
The target type and target ID cannot be changed after creation.

### Stopping a maintenance

Click **Stop** on any **ACTIVE** maintenance to end it immediately.
The maintenance moves to **EXPIRED** status and its alerts resume normally.

### Reactivating a maintenance

Click **Reactivate** on any **EXPIRED** maintenance that was stopped manually
to bring it back to **ACTIVE** status. This clears the `ended_at` timestamp.

> If the maintenance had an `expires_at` in the past it will immediately
> expire again — use **Edit** to extend the expiry first.

### Deleting a maintenance

Click the red delete button to permanently remove a maintenance entry from the history.

## Status Reference

| Status | Meaning |
|---|---|
| `ACTIVE` | Currently in effect — alerts are affected |
| `SCHEDULED` | `starts_at` is in the future — not yet active |
| `EXPIRED` | Ended manually or past `expires_at` |

## Effect Reference

| Effect | Alert visibility | Use case |
|---|---|---|
| `badge` | Visible, tagged with maintenance label | Work in progress, NOC awareness needed |
| `hide` | Suppressed — not shown in active alerts | Planned downtime, known noisy maintenance |

## Persistence

Maintenances are stored in `config/maintenances.yaml` alongside `app.yaml`.
The file is written atomically on every create / update / stop / delete operation.
Expiry is evaluated at read time — no background job or cron is required.

## Feature Toggle

The Maintenances page can be hidden from the sidebar via
**Settings → Views → Pages & Navigation → Maintenances**.
The backend API remains available regardless of this setting.

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/maintenances` | List all maintenances with computed status |
| `POST` | `/api/maintenances` | Create a new maintenance |
| `PUT` | `/api/maintenances/{id}` | Update reason, effect, or expiry |
| `POST` | `/api/maintenances/{id}/stop` | Manually end an active maintenance |
| `POST` | `/api/maintenances/{id}/reactivate` | Reactivate a stopped maintenance |
| `DELETE` | `/api/maintenances/{id}` | Delete a maintenance entry |
