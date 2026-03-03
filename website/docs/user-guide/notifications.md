---
id: notifications
title: Notifications & Sound Alerts
sidebar_position: 7
---

# Notifications & Sound Alerts

## Notification feed

The notification feed (`/notifications`) shows all active CRIT and WARN alerts across the infrastructure. Alerts are grouped by severity, sortable by rack, room, or check type.

## Sound alerts

Rackscope can play a sound when new alerts appear — useful for NOC wallboard environments where the operator may not be actively watching the screen.

### Enable

Go to **Settings → Notifications** and toggle **Enable sound alerts**.

### Configuration

| Setting | Description |
|---|---|
| **WARN sound** | Sound played when a new WARN alert is detected |
| **CRIT sound** | Sound played when a new CRIT alert is detected |
| **Volume** | Alert sound volume (0–100%) |
| **Play when** | Control when sounds fire: always, tab in background only, or tab in foreground only |

### Sound presets

All sounds are generated via the Web Audio API — no external files, no licensing issues.

| Preset | Description | Suggested use |
|---|---|---|
| **Soft ping** | Gentle sine wave | Subtle WARN notification |
| **Double beep** | Two short beeps | Clear WARN attention signal |
| **Alert tone** | Rising sawtooth tone | Moderate urgency |
| **Alarm** | Rapid alternating tones | High urgency CRIT |
| **NOC chime** | Three-note descending chime | Professional NOC environments |

Use the **Test** buttons next to each picker, or **Preview all sounds** at the bottom of the section to hear each preset before activating.

### Browser autoplay

Browsers block audio until the user interacts with the page at least once. Click any **Test** button after loading to unlock sounds for that session.

### How it works

The sound hook polls `/api/alerts/active` every 30 seconds from every page (mounted in the app layout). It compares the current alert IDs against the previous poll — only **new** alerts trigger a sound. The first poll on page load is skipped to avoid a burst of sounds on startup.

Settings are persisted in `localStorage` under `rackscope.sound-alerts`.
