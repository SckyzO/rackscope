---
id: playlist
title: Playlist (NOC Rotation)
sidebar_position: 14
---

# Playlist — NOC Screen Rotation

The **Playlist** feature rotates the UI through a sequence of views automatically, designed
for NOC screens and wallboards that need to cycle through multiple dashboards without operator
interaction.

![Playlist Center](/img/screenshots/playlist.png)

---

## Enabling Playlist Mode

Playlist mode is controlled by the `features.playlist` flag in `config/app.yaml`:

```yaml
features:
  playlist: true
```

When enabled, a **Playlist** entry appears in the sidebar and the `/playlist` route becomes
accessible.

---

## Configuring the Rotation

The default rotation and interval are defined in `config/app.yaml`:

```yaml
playlist:
  interval_seconds: 30
  views:
    - /views/worldmap
    - /slurm/overview
    - /views/room/hall-a
    - /slurm/wallboard
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `interval_seconds` | integer | `30` | Time in seconds each view is displayed before advancing |
| `views` | list of strings | — | Ordered list of frontend routes to cycle through |

Any valid Rackscope route can be used in the `views` list:
- Physical views: `/views/worldmap`, `/views/site/:id`, `/views/room/:id`, `/views/rack/:id`
- Slurm views: `/slurm/overview`, `/slurm/wallboard`, `/slurm/nodes`
- Dashboards: `/`, `/dashboard/:id`
- Cluster: `/views/cluster`

---

## Playlist Center (`/playlist`)

The Playlist Center is the control page for managing the rotation. From here you can:

- **Start / Stop** the rotation
- **Select which dashboards** to include in the cycle
- **Set the interval** per view
- **Navigate manually** to any view in the list
- **Toggle individual views** on or off without removing them from the config

The rotation state persists in `localStorage` — closing and reopening the browser resumes the
playlist from where it left off.

:::tip
For NOC screens, launch Rackscope in full-screen mode (`F11`) and navigate to `/playlist` to
start the rotation. The UI hides the sidebar in full-screen playlist mode to maximize the
viewing area.
:::

---

## Dashboard Integration

Each dashboard created in the [Dashboard](/user-guide/dashboard) editor has a **playlist toggle**
in its settings. When enabled, that dashboard is automatically included in the rotation.

This means you can build dedicated NOC dashboards (one per room, one per cluster) and rotate
through them automatically without manually editing the `playlist.views` list in `app.yaml`.

---

## Keyboard Controls

While the playlist is running:

| Key | Action |
|-----|--------|
| `Space` | Pause / Resume rotation |
| `→` (Right arrow) | Skip to next view |
| `←` (Left arrow) | Go to previous view |
| `Esc` | Stop rotation and exit to dashboard |
