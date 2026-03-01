---
id: wizard
title: Setup Wizard
sidebar_position: 12
---

# Setup Wizard

When you launch Rackscope for the first time (or when the configuration is empty),
a **Setup Wizard** guides you through the initial configuration step-by-step.

:::info
The setup wizard can be re-launched at any time from **Settings > General > Re-run Setup Wizard**
:::

---

## When It Appears

The wizard launches automatically in two situations:

- **First launch**: No topology file is found at the configured path (or the topology is empty).
- **Manual reset**: You triggered a reset from **Settings > General > Re-run Setup Wizard** or
  issued a `DELETE /api/topology/reset` API call.

Once you complete (or skip) the wizard, Rackscope stores a flag and will not show it again
on next load — unless you explicitly re-run it.

:::tip
Even if you prefer to write YAML by hand, running the wizard once is a useful way to generate
a valid base configuration that you can then version-control with Git.
:::

---

## Step 1: Welcome

The first screen introduces Rackscope and its core concepts so every operator — regardless of
prior experience — starts with a shared mental model.

**What you will see:**

- A brief description of what Rackscope does (physical monitoring layer over Prometheus)
- The topology hierarchy at a glance:

  ```
  Site → Room → Aisle → Rack → Device → Instance
  ```

- A note clarifying what Rackscope is **not**: it does not replace your CMDB, Grafana, or
  Prometheus — it complements them with a physical-layer view.

> _[Screenshot placeholder: Welcome step with hierarchy diagram]_

**Actions:** Click **Next** to continue, or **Skip wizard** to go directly to the empty dashboard.

---

## Step 2: Prometheus Connection

Rackscope is Prometheus-first. Without a working Prometheus endpoint, health states and metrics
cannot be displayed. This step ensures the connection is valid before you build your topology.

**Fields:**

| Field | Description | Default |
|---|---|---|
| Prometheus URL | Base URL of your Prometheus instance | `http://localhost:9090` |
| Authentication | None / Basic Auth / Bearer Token | None |
| Username | Basic auth username (if applicable) | — |
| Password / Token | Credential (stored in `app.yaml`, never in the browser) | — |
| TLS Skip Verify | Disable TLS certificate validation (dev/self-signed certs) | Off |

**Test Connection button**

Clicking **Test Connection** sends a probe request to `/api/prometheus/test` which queries
`up` against your Prometheus. The result is displayed inline:

- Green checkmark: connection successful, Prometheus version shown
- Red warning: connection failed, error message shown (network error, auth failure, etc.)

:::warning
Do not proceed without a successful connection test unless you intend to configure Prometheus later.
Health states will show as **UNKNOWN** until Prometheus is reachable.
:::

> _[Screenshot placeholder: Prometheus step with successful connection badge]_

**Actions:** Click **Next** to continue. The URL and auth settings are saved to `config/app.yaml`.

---

## Step 3: Create Your First Site

A **Site** is the top-level entity in the Rackscope hierarchy. It typically represents a physical
datacenter, a building, or a campus.

**Fields:**

| Field | Description | Required |
|---|---|---|
| Site ID | Short identifier used in YAML and URLs (e.g., `dc-paris`) | Yes |
| Display Name | Human-readable name shown in the UI (e.g., `Paris DC`) | Yes |
| Latitude | Decimal latitude for world map pin | No |
| Longitude | Decimal longitude for world map pin | No |
| Description | Free-text description (shown in tooltips) | No |

:::tip
If you provide lat/lon coordinates, your site will appear as a pin on the **World Map** view.
You can always add or update coordinates later from the Topology Editor.
:::

> _[Screenshot placeholder: Create site step with map preview]_

**Actions:** Click **Next**. The site is written to `config/topology/sites.yaml`.

---

## Step 4: Create Your First Room

A **Room** is a physical space within a site — a server room, a machine room, or a data hall.

**Fields:**

| Field | Description | Required |
|---|---|---|
| Room ID | Short identifier (e.g., `hall-a`) | Yes |
| Display Name | Human-readable name (e.g., `Hall A`) | Yes |
| Orientation | Compass direction of the room entrance (N / S / E / W) | No |
| Grid Columns | Number of aisle columns for the floor plan | No |
| Grid Rows | Number of aisle rows for the floor plan | No |

The orientation and grid settings power the **Room Floor Plan** view, which renders aisles and
racks as a navigable 2D layout.

> _[Screenshot placeholder: Create room step with orientation picker]_

**Actions:** Click **Next**. The room is added under your site in the topology files.

---

## Step 5: Add Your First Rack

A **Rack** is a physical equipment cabinet. You can add it directly to the room (standalone) or
inside an aisle. The wizard creates a standalone rack for simplicity — you can reorganize into
aisles later with the Topology Editor.

**Fields:**

| Field | Description | Required |
|---|---|---|
| Rack ID | Short identifier (e.g., `rack-01`) | Yes |
| Display Name | Human-readable name (e.g., `Rack 01`) | Yes |
| U Height | Total rack height in rack units (e.g., `42`) | Yes |
| Rack Template | Optional template that predefines infrastructure (PDUs, HMC, etc.) | No |

**Rack templates** define rear infrastructure and side-mounted components (power banks,
cable management). If you have a template catalog already, you can select one here.
Otherwise, leave blank and configure it later via the Template Editor.

> _[Screenshot placeholder: Create rack step with U height preview]_

**Actions:** Click **Next**. The rack is written to the topology under your room.

---

## Step 6: Demo Mode

If you do not have a real Prometheus instance yet, or want to explore Rackscope's features
before connecting live hardware, **Demo Mode** lets you start with simulated metrics.

**What demo mode does:**

- Enables the **Simulator plugin** which generates realistic Prometheus metrics for your topology
- Prometheus scrapes the simulator on its normal schedule (transparent to the backend)
- You can experiment with health states, thresholds, overrides, and all UI features

**Demo scenario options:**

| Scenario | Description |
|---|---|
| `demo-small` | Small topology with a few nodes in WARN/CRIT state — good for first-time exploration |
| `full-ok` | All nodes healthy — useful for baseline visual testing |
| `random-demo-small` | Random failures with a different seed each run |

:::info
Demo mode writes `features.demo: true` and a `simulator.scenario` entry to `config/app.yaml`.
You can disable it at any time from **Settings > General**.
:::

> _[Screenshot placeholder: Demo mode step with scenario picker]_

**Actions:** Toggle demo mode on or off, select a scenario, then click **Finish**.

---

## Completion

After Step 6, the wizard saves all configuration and navigates you to the **Dashboard**.

You will see:

- Your site on the **World Map** (if coordinates were provided)
- Your room in the site's room list
- Your rack in the room floor plan
- Health states populated (either from Prometheus or the simulator)

From here, you can:

- Add more sites, rooms, aisles, and racks via the **Topology Editor** (`/editors/topology`)
- Add devices to your rack via the **Rack Editor** (`/editors/rack/your-rack-id`)
- Configure health checks in the **Checks Library Editor** (`/editors/checks`)
- Explore the rest of the **User Guide** to learn about views and features

:::tip
The wizard creates a minimal but valid YAML configuration. All files are human-readable and
version-control friendly — commit them to Git as soon as you are happy with the initial setup.
:::
