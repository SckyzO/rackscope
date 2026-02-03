# Mockups - Design Iterations

This directory contains HTML mockups for UI design iterations.

## Purpose

- **Rapid prototyping**: Test design concepts before implementing in React
- **Design validation**: Share with stakeholders for feedback
- **Version history**: Track design evolution over time

## Versions

### v0.1 - Dashboard Overview (Mission Control Brutalism)
- **File**: `v0.1/dashboard-overview.html`
- **Design aesthetic**: Mission Control Brutalism - NASA control room density meets industrial design
- **Features**:
  - Hero section with 4 status cards (Global Status, Active Alerts, Managed Racks, Prometheus)
  - Two-column layout: Rooms list + Alerts/Telemetry
  - Collapsible sidebar with sections (Core, Workload, Infrastructure, System)
  - Chart.js integration for Prometheus metrics
  - Dark theme with JetBrains Mono font
  - Status glows and hover effects

## How to Use

Open any HTML file directly in a browser:
```bash
firefox mockup/v0.1/dashboard-overview.html
# or
chromium mockup/v0.1/dashboard-overview.html
```

No build step required - all dependencies (Tailwind CSS, Chart.js) are loaded via CDN.

## Adding New Versions

1. Create a new version directory: `mockup/v0.X/`
2. Add your HTML mockup file(s)
3. Update this README with version notes
