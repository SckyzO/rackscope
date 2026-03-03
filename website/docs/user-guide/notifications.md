---
id: notifications
title: Notifications & Sound Alerts
sidebar_position: 7
---

# Notifications & Sound Alerts

## Notification feed

The notification feed (`/notifications`) shows all active CRIT and WARN alerts across the infrastructure. Alerts are grouped by severity, sortable by rack, room, or check type.

## Notification panel

The notification panel (accessed via the bell icon in the header) provides quick access to active alerts without leaving your current view.

### Adaptive height

The panel automatically adjusts its height to show the actual number of alerts:
- Shows `min(actual alerts, max_visible)` rows
- `max_visible` is configured in **Settings → Notifications → Stack threshold** (default: 10)
- When actual alerts < max_visible: panel shows exactly that many rows
- When actual alerts > max_visible: shows max rows + a "+N more" link to the full notification view

### Badge behavior

The bell icon shows a badge with the alert count:
- **Red badge with count**: When sounds are unmuted
- **Gray badge with count**: When sounds are muted (via the mute toggle)

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
| **Double beep** | Two short beeps | Clear WARN attention signal (default for WARN) |
| **Alert tone** | Rising sawtooth tone | Moderate urgency |
| **Alarm** | Rapid alternating tones | High urgency CRIT |
| **NOC chime** | Three-note descending chime | Professional NOC environments |
| **Siren** | Fire truck two-tone siren (960/770Hz, 3 cycles) | Critical failures (default for CRIT) |

**Default settings**: Critical=Siren, Warning=Double beep

### Preview buttons

Every sound preset has a **Test** button that lets you preview the sound without waiting for an actual alert. This is useful for:
- Choosing the right sound for your environment
- Testing volume levels
- Unlocking browser audio permissions

There's also a **Preview all sounds** button at the bottom of the sound settings section that plays each preset in sequence.

### Browser autoplay

Browsers block audio until the user interacts with the page at least once. Click any **Test** button after loading to unlock sounds for that session.

### Mute toggle

You can quickly silence sound alerts without disabling them entirely:

1. Click the volume icon (Volume2/VolumeX) in the notification panel header
2. When muted:
   - The bell icon in the header changes to BellOff
   - The badge turns gray
   - Visual notifications (toasts) still appear
   - Sound alerts are suppressed until you unmute

The mute state is persisted in `localStorage` under `rackscope.notifications.muted`.

:::tip
The mute toggle is ideal for temporary silence during meetings or focused work, while the Settings option is for permanent configuration.
:::

### How it works

Sounds are triggered in sync with visual toast notifications:
- The alert polling system checks `/api/alerts/active` every 30 seconds
- When new alerts are detected, both the visual toast and sound alert fire simultaneously
- Only **new** alerts trigger a sound (based on alert ID comparison)
- The first poll on page load is skipped to avoid a burst of sounds on startup
- Sounds and toasts always stay synchronized — there's no separate polling for sounds

Settings are persisted in `localStorage` under `rackscope.sound-alerts`.
