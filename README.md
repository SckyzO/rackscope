# Rackscope 🔭

> **Physical Infrastructure Monitoring for HPC & Data Centers.**

Rackscope bridges the gap between physical layout (Racks, Chassis, Cables) and logical telemetry (Prometheus). It provides a "Pixel Perfect" visualization of your datacenter, powered by real-time data.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

## 🚀 Key Features

*   **HPC Native**: Support for High-Density chassis (Twins, Quads), Blades, and Liquid Cooling (DLC).
*   **Prometheus First**: No database to maintain. Direct PromQL querying.
*   **Template System**: Define your hardware once (YAML), use it everywhere.
*   **Full Visibility**: Front View, Rear View, and Infrastructure (PDU/HMC).
*   **Modern UI**: React, Tailwind v4, Dark/Light modes.

## 📦 Quick Start (Docker)

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/SckyzO/rackscope.git
    cd rackscope
    ```

2.  **Start the stack**:
    ```bash
    docker compose up -d --build
    ```

3.  **Access the UI**:
    Open [http://localhost:5173](http://localhost:5173)

4.  **Explore**:
    - **Frontend**: [http://localhost:5173](http://localhost:5173)
    - **Prometheus**: [http://localhost:9090](http://localhost:9090)
    - **Simulator**: [http://localhost:9000](http://localhost:9000)

## 📚 Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Administrator Guide (Configuration)](docs/ADMIN_GUIDE.md)
- [User Guide](docs/USER_GUIDE.md)

## 🛠️ Configuration

Topologies are defined in `config-examples/topology.yaml`.
Hardware templates are in `config-examples/templates/`.

Example Rack Definition:
```yaml
- id: r4-01
  template_id: bull-xh3000
  devices:
    - id: chassis-01
      template_id: bs-x440-a5
      nodes: "compute[001-004]"
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) for development rules.