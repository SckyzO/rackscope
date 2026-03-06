---
id: ui-library
title: UI Library & Design System
sidebar_position: 11
---

# UI Library & Design System

Rackscope's frontend is built on a comprehensive design system inherited from TailAdmin,
enhanced with infrastructure-monitoring-specific components.

![UI Library](/img/screenshots/ui-library.png)

---

## Design System Overview

The visual foundation of Rackscope is built on three pillars:

- **TailAdmin base**: A production-grade admin UI kit providing consistent layout patterns, spacing, and component primitives.
- **Tailwind CSS v4**: Utility-first styling with full support for arbitrary values, custom palettes, and runtime theming.
- **Outfit font**: A geometric sans-serif typeface optimized for legibility on dense data screens and NOC wallboards.

Dark mode is treated as the primary experience. Every component is designed dark-first and then adapted for light mode, not the other way around. This matches the expectations of NOC operators and on-call engineers working in low-light environments.

---

## Accessing the UI Library

The UI Library is a live, interactive reference page built into every Rackscope instance. It renders all components using the currently active theme so you can preview the effect of palette and accent changes in real time.

**To open the UI Library:**

1. Navigate to `/ui` in your browser while Rackscope is running, for example `http://localhost:5173/ui`.
2. Alternatively, go to **Settings > Appearance** and click the **Open UI Library** link at the bottom of the section.

The page is read-only and does not affect any configuration. It is safe to open during production operation.

---

## Theme System

Rackscope ships with a fully configurable theme system. Changes are applied instantly and persisted to `localStorage` — no reload required.

### Accent Colors

Accent colors control interactive elements: active sidebar items, focused inputs, primary buttons, progress indicators, and link text.

| Name    | Hex       | Character                                      |
|---------|-----------|------------------------------------------------|
| Indigo  | `#465fff` | Default. Professional, neutral, high contrast. |
| Violet  | `#7c3aed` | Bold. High visibility on dark backgrounds.     |
| Emerald | `#059669` | Calm. Common in infrastructure tooling.        |
| Rose    | `#e11d48` | Alert-like. Use with caution in NOC contexts.  |
| Amber   | `#d97706` | Warm. Pairs well with dark and solarized palettes. |

### Dark Palettes

| Name   | Character                                                                                      |
|--------|------------------------------------------------------------------------------------------------|
| Void   | Near-black backgrounds (`#0a0a0f`). Maximum contrast, minimum eye strain. Recommended default for NOC. |
| Navy   | Deep blue-gray tones. Familiar to users of traditional network monitoring dashboards.          |
| Forest | Dark green-tinted surfaces. Low-fatigue for long shifts. Pairs well with Emerald accent.       |
| Matrix | Special mode — see [Matrix Mode](#matrix-mode) below.                                          |

### Light Palettes

| Name      | Character                                                                        |
|-----------|----------------------------------------------------------------------------------|
| Slate     | Cool neutral grays. Clean and professional. Recommended for office environments. |
| Warm      | Slightly warm whites. Reduces blue-light exposure on extended sessions.          |
| Cool      | Crisp blue-white tones. High contrast for bright rooms.                          |
| Solarized | Ethan Schoonover's classic palette. Familiar to terminal-heavy users.            |

### Changing the Theme

1. Open **Settings** from the left sidebar.
2. Navigate to the **Appearance** section.
3. Select an accent color and a palette.
4. Changes apply immediately across the entire interface.

---

## Matrix Mode

Matrix mode is a special Easter egg palette activated by selecting the **Matrix** dark palette in Settings > Appearance.

When active, it applies a CRT aesthetic to the entire interface:

- **Phosphor green typography** on near-black backgrounds
- **Scanline overlay** simulating an old cathode-ray monitor
- **Crosshair cursor** replacing the default pointer
- Monospace font substituted for data tables and code blocks
- Subtle flicker animation on status badges

Matrix mode is fully functional — all monitoring data, health states, and navigation work normally. It is not a demo mode.

:::tip
Matrix mode was designed for after-hours NOC shifts and conference demos. It is deliberately distinctive. Do not deploy it as the default theme in shared environments unless your team agrees.
:::

---

## Component Categories

The UI Library page organizes all components into the following categories.

### Buttons



Buttons are available in three variants, four sizes, and multiple states:

- **Variants**: Primary (filled accent), Secondary (outlined), Ghost (text only)
- **Sizes**: `xs`, `sm`, `md`, `lg`
- **States**: Default, Hover, Active, Disabled, Loading (spinner)
- **With icons**: Left icon, right icon, icon-only

### Badges



Badges are compact labels used for status annotation, tag display, and category markers.

- **Solid**: Filled background, used for active states and primary labels
- **Outline**: Border only, used for secondary or inactive labels
- **Sizes**: `sm` (default in tables), `md` (used in detail panels)
- **Semantic colors**: Inherits health state palette (see [Health State Colors](#health-state-colors))

### Alerts



Alert banners are used for inline feedback, form validation, and system notices.

- **Info**: Blue — general informational messages
- **Success**: Green — confirmation of completed actions
- **Warning**: Amber — non-critical issues requiring attention
- **Error**: Red — failures or blocking conditions
- **Dismissible**: Optional close button available on all variants

### Forms



Form components are used in the Settings page, topology editors, and configuration dialogs.

- **Text inputs**: Single-line, with label, hint text, and error state
- **Textareas**: Multi-line, resizable, used for YAML editing outside Monaco
- **Selects**: Dropdown with searchable option list
- **Checkboxes**: With and without label, indeterminate state supported
- **Toggle switches**: Binary on/off controls used for feature flags
- **Radio groups**: Mutually exclusive selection (used in accent/palette pickers)

### Modals



Modals are used for confirmations, destructive action warnings, and compact detail overlays.

- **Confirmation dialog**: Cancel + Confirm buttons, customizable severity
- **Alert modal**: Single-action acknowledgment
- **Form modal**: Embedded form within a modal shell
- **Sizes**: `sm`, `md`, `lg`, `full`
- All modals are focus-trapped and keyboard-dismissible via `Escape`

### Charts



Charts are rendered using ApexCharts and are used throughout device detail pages and the Slurm dashboards.

- **Bar chart**: Used for partition utilization and node state distributions
- **Line chart**: Used for time-series metric history (temperature, power)
- **Radial/donut chart**: Used for capacity summaries in cluster overview
- **Heatmap**: Used in the Slurm wallboard for rack-level state grids

All charts respond to the active theme and re-render when the palette changes.

---

## Health State Colors

Health state indicators appear throughout Rackscope: rack grids, device panels, node lists, badges, and chart legends. These colors are fixed regardless of the active accent or palette to ensure consistent operator interpretation.

| State   | Color   | Hex       | Usage context                                    |
|---------|---------|-----------|--------------------------------------------------|
| OK      | Green   | `#10b981` | All checks passing, node up, no active alerts    |
| WARN    | Amber   | `#f59e0b` | At least one warning-level check failing         |
| CRIT    | Red     | `#ef4444` | At least one critical-level check failing        |
| UNKNOWN | Gray    | `#6b7280` | No data returned, check error, or unmonitored    |

Health states aggregate upward through the topology: Node → Chassis → Rack → Room → Site. The worst state at any child level propagates to the parent. A rack showing CRIT means at least one device or node within it is in a critical state.

---

## Dark Mode Best Practices

Rackscope is tested in both light and dark modes before every release. When contributing UI changes or deploying custom configurations, follow these guidelines:

- **Default to dark**: Set dark mode as the default for any shared NOC or wallboard deployment. Use `localStorage` key `rackscope-theme` with value `dark` to pre-seed the preference before first load.
- **Test both modes**: Any component change must be visually verified in both Void (dark) and Slate (light) before shipping.
- **Never rely on color alone**: All status indicators pair color with an icon or text label. Users with color vision deficiency must be able to interpret state without relying on hue.
- **Contrast targets**: Rackscope targets WCAG AA contrast ratios for all text on backgrounds. Avoid overriding text or background colors with values that fall below 4.5:1 for normal text or 3:1 for large text.

---

## Easter Eggs

Rackscope includes a small set of Easter eggs intended for demos and off-hours use.

**Terminal overlay**: Type `help` anywhere in the interface (while no input is focused) to open a terminal-style overlay displaying available keyboard shortcuts and a brief system status summary. Dismiss it by pressing `Escape` or clicking outside the overlay.

**Matrix mode**: Described in detail in the [Matrix Mode](#matrix-mode) section above.

These features are cosmetic and do not affect any monitoring data or configuration state.
